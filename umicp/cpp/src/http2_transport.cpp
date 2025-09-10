/**
 * HTTP/2 Transport Implementation using nghttp2
 * Real HTTP/2 implementation for production use
 */

#include "http2_transport.h"
#include "serialization.h"
#include <nghttp2/nghttp2.h>
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <fcntl.h>
#include <iostream>
#include <thread>
#include <atomic>
#include <mutex>
#include <queue>
#include <condition_variable>
#include <map>

namespace umicp {

// HTTP/2 connection and session management
class HTTP2Transport::Impl {
public:
    struct HTTP2Stream {
        int32_t stream_id;
        ByteBuffer data;
        bool headers_sent;
        bool data_sent;

        HTTP2Stream(int32_t id) : stream_id(id), headers_sent(false), data_sent(false) {}
    };

    TransportConfig config_;
    std::string host_;
    int port_;
    std::string path_;

    // Network
    int socket_fd_;
    SSL_CTX* ssl_ctx_;
    SSL* ssl_;
    nghttp2_session* session_;

    // State
    std::atomic<bool> connected_;
    std::atomic<bool> should_stop_;

    // Threading
    std::thread io_thread_;
    std::mutex send_mutex_;
    std::queue<ByteBuffer> send_queue_;
    std::condition_variable send_cv_;

    // Stream management
    std::map<int32_t, std::unique_ptr<HTTP2Stream>> streams_;
    std::atomic<int32_t> next_stream_id_;
    std::mutex streams_mutex_;

    // Callbacks
    MessageCallback message_callback_;
    ConnectionCallback connection_callback_;
    ErrorCallback error_callback_;
    std::mutex callback_mutex_;

    // Statistics
    TransportStats stats_;
    std::mutex stats_mutex_;

    Impl(const TransportConfig& config)
        : config_(config), host_(config.host), port_(config.port), path_("/umicp"),
          socket_fd_(-1), ssl_ctx_(nullptr), ssl_(nullptr), session_(nullptr),
          connected_(false), should_stop_(false), next_stream_id_(1) {
        stats_.last_activity = std::chrono::steady_clock::now();
    }

    ~Impl() {
        cleanup();
    }

    void cleanup() {
        should_stop_.store(true);

        if (io_thread_.joinable()) {
            io_thread_.join();
        }

        if (session_) {
            nghttp2_session_del(session_);
            session_ = nullptr;
        }

        if (ssl_) {
            SSL_free(ssl_);
            ssl_ = nullptr;
        }

        if (ssl_ctx_) {
            SSL_CTX_free(ssl_ctx_);
            ssl_ctx_ = nullptr;
        }

        if (socket_fd_ >= 0) {
            close(socket_fd_);
            socket_fd_ = -1;
        }
    }

    Result<void> connect() {
        if (connected_.load()) {
            return Result<void>(ErrorCode::INVALID_ARGUMENT, "Already connected");
        }

        // Create socket
        socket_fd_ = socket(AF_INET, SOCK_STREAM, 0);
        if (socket_fd_ < 0) {
            return Result<void>(ErrorCode::NETWORK_ERROR, "Failed to create socket");
        }

        // Set non-blocking
        int flags = fcntl(socket_fd_, F_GETFL, 0);
        fcntl(socket_fd_, F_SETFL, flags | O_NONBLOCK);

        // Connect to server
        struct sockaddr_in addr;
        memset(&addr, 0, sizeof(addr));
        addr.sin_family = AF_INET;
        addr.sin_port = htons(port_);

        if (inet_pton(AF_INET, host_.c_str(), &addr.sin_addr) <= 0) {
            cleanup();
            return Result<void>(ErrorCode::NETWORK_ERROR, "Invalid host address");
        }

        int result = ::connect(socket_fd_, (struct sockaddr*)&addr, sizeof(addr));
        if (result < 0 && errno != EINPROGRESS) {
            cleanup();
            return Result<void>(ErrorCode::NETWORK_ERROR, "Failed to connect");
        }

        // Wait for connection
        fd_set write_fds;
        FD_ZERO(&write_fds);
        FD_SET(socket_fd_, &write_fds);

        struct timeval timeout;
        timeout.tv_sec = 5;
        timeout.tv_usec = 0;

        result = select(socket_fd_ + 1, nullptr, &write_fds, nullptr, &timeout);
        if (result <= 0) {
            cleanup();
            return Result<void>(ErrorCode::TIMEOUT, "Connection timeout");
        }

        // Initialize SSL with configuration
        SSL_library_init();
        SSL_load_error_strings();
        OpenSSL_add_all_algorithms();

        // Configure SSL context based on SSLConfig
        const SSL_METHOD* method = TLS_client_method();
        if (config_.ssl_config && config_.ssl_config->enable_ssl) {
            ssl_ctx_ = SSL_CTX_new(method);
            if (!ssl_ctx_) {
                cleanup();
                return Result<void>(ErrorCode::NETWORK_ERROR, "Failed to create SSL context");
            }

            // Configure SSL context options
            if (!config_.ssl_config->ca_file.empty()) {
                if (SSL_CTX_load_verify_locations(ssl_ctx_, config_.ssl_config->ca_file.c_str(), nullptr) != 1) {
                    cleanup();
                    return Result<void>(ErrorCode::NETWORK_ERROR, "Failed to load CA certificates");
                }
            }

            if (!config_.ssl_config->cert_file.empty()) {
                if (SSL_CTX_use_certificate_file(ssl_ctx_, config_.ssl_config->cert_file.c_str(), SSL_FILETYPE_PEM) != 1) {
                    cleanup();
                    return Result<void>(ErrorCode::NETWORK_ERROR, "Failed to load client certificate");
                }
            }

            if (!config_.ssl_config->key_file.empty()) {
                if (SSL_CTX_use_PrivateKey_file(ssl_ctx_, config_.ssl_config->key_file.c_str(), SSL_FILETYPE_PEM) != 1) {
                    cleanup();
                    return Result<void>(ErrorCode::NETWORK_ERROR, "Failed to load private key");
                }

                if (SSL_CTX_check_private_key(ssl_ctx_) != 1) {
                    cleanup();
                    return Result<void>(ErrorCode::NETWORK_ERROR, "Private key does not match certificate");
                }
            }

            // Set cipher list if specified
            if (!config_.ssl_config->cipher_list.empty()) {
                if (SSL_CTX_set_cipher_list(ssl_ctx_, config_.ssl_config->cipher_list.c_str()) != 1) {
                    cleanup();
                    return Result<void>(ErrorCode::NETWORK_ERROR, "Failed to set cipher list");
                }
            }

            ssl_ = SSL_new(ssl_ctx_);
            if (!ssl_) {
                cleanup();
                return Result<void>(ErrorCode::NETWORK_ERROR, "Failed to create SSL");
            }

            // Configure SSL verification
            if (config_.ssl_config->verify_peer) {
                SSL_set_verify(ssl_, SSL_VERIFY_PEER, nullptr);
            } else {
                SSL_set_verify(ssl_, SSL_VERIFY_NONE, nullptr);
            }

            SSL_set_fd(ssl_, socket_fd_);

            result = SSL_connect(ssl_);
            if (result <= 0) {
                cleanup();
                return Result<void>(ErrorCode::NETWORK_ERROR, "SSL handshake failed");
            }
        }

        // Initialize nghttp2 session
        nghttp2_session_callbacks* callbacks;
        nghttp2_session_callbacks_new(&callbacks);

        nghttp2_session_callbacks_set_on_frame_recv_callback(callbacks, on_frame_recv);
        nghttp2_session_callbacks_set_on_data_chunk_recv_callback(callbacks, on_data_chunk_recv);
        nghttp2_session_callbacks_set_on_stream_close_callback(callbacks, on_stream_close);
        nghttp2_session_callbacks_set_on_header_callback(callbacks, on_header);
        nghttp2_session_callbacks_set_on_begin_headers_callback(callbacks, on_begin_headers);

        int rv = nghttp2_session_client_new(&session_, callbacks, this);
        nghttp2_session_callbacks_del(callbacks);

        if (rv != 0) {
            cleanup();
            return Result<void>(ErrorCode::NETWORK_ERROR, "Failed to create HTTP/2 session");
        }

        // Send connection preface
        nghttp2_settings_entry iv[] = {
            {NGHTTP2_SETTINGS_MAX_CONCURRENT_STREAMS, 100},
            {NGHTTP2_SETTINGS_INITIAL_WINDOW_SIZE, 1024 * 1024},
        };

        rv = nghttp2_submit_settings(session_, NGHTTP2_FLAG_NONE, iv, sizeof(iv) / sizeof(iv[0]));
        if (rv != 0) {
            cleanup();
            return Result<void>(ErrorCode::NETWORK_ERROR, "Failed to submit settings");
        }

        // Start I/O thread
        should_stop_.store(false);
        io_thread_ = std::thread([this]() { run_io_loop(); });

        connected_.store(true);

        {
            std::lock_guard<std::mutex> lock(stats_mutex_);
            stats_.connection_count++;
        }

        {
            std::lock_guard<std::mutex> lock(callback_mutex_);
            if (connection_callback_) {
                connection_callback_(true, "");
            }
        }

        return Result<void>();
    }

    Result<void> disconnect() {
        if (!connected_.load()) {
            return Result<void>();
        }

        should_stop_.store(true);
        connected_.store(false);

        if (io_thread_.joinable()) {
            io_thread_.join();
        }

        cleanup();

        {
            std::lock_guard<std::mutex> lock(callback_mutex_);
            if (connection_callback_) {
                connection_callback_(false, "Disconnected");
            }
        }

        return Result<void>();
    }

    Result<void> send(const ByteBuffer& data) {
        if (!connected_.load()) {
            return Result<void>(ErrorCode::NETWORK_ERROR, "Not connected");
        }

        if (data.empty()) {
            return Result<void>(ErrorCode::INVALID_ARGUMENT, "Data cannot be empty");
        }

        // Create new stream
        int32_t stream_id = next_stream_id_.fetch_add(2); // Client streams are odd

        {
            std::lock_guard<std::mutex> lock(streams_mutex_);
            streams_[stream_id] = std::make_unique<HTTP2Stream>(stream_id);
            streams_[stream_id]->data = data;
        }

        // Send headers
        const char* method = "POST";
        const char* scheme = "https";
        std::string content_length_str = std::to_string(data.size());

        nghttp2_nv headers[] = {
            {(uint8_t*)":method", (uint8_t*)method, 7, 4, NGHTTP2_NV_FLAG_NONE},
            {(uint8_t*)":path", (uint8_t*)path_.c_str(), 5, path_.length(), NGHTTP2_NV_FLAG_NONE},
            {(uint8_t*)":scheme", (uint8_t*)scheme, 7, 5, NGHTTP2_NV_FLAG_NONE},
            {(uint8_t*)"content-type", (uint8_t*)"application/octet-stream", 12, 24, NGHTTP2_NV_FLAG_NONE},
            {(uint8_t*)"content-length", (uint8_t*)content_length_str.c_str(), 14, content_length_str.length(), NGHTTP2_NV_FLAG_NONE}
        };

        nghttp2_data_provider data_provider;
        data_provider.read_callback = [](nghttp2_session* session, int32_t stream_id,
                                        uint8_t* buf, size_t length, uint32_t* data_flags,
                                        nghttp2_data_source* source, void* user_data) -> ssize_t {
            Impl* impl = static_cast<Impl*>(user_data);
            std::lock_guard<std::mutex> lock(impl->streams_mutex_);

            auto it = impl->streams_.find(stream_id);
            if (it == impl->streams_.end()) {
                return NGHTTP2_ERR_CALLBACK_FAILURE;
            }

            HTTP2Stream* stream = it->second.get();
            size_t remaining = stream->data.size() - (stream->data_sent ? stream->data.size() : 0);

            if (remaining == 0) {
                *data_flags |= NGHTTP2_DATA_FLAG_EOF;
                return 0;
            }

            size_t to_copy = std::min(length, remaining);
            memcpy(buf, stream->data.data() + (stream->data_sent ? stream->data.size() - remaining : 0), to_copy);

            if (to_copy == remaining) {
                stream->data_sent = true;
                *data_flags |= NGHTTP2_DATA_FLAG_EOF;
            }

            return to_copy;
        };

        int rv = nghttp2_submit_request(session_, nullptr, headers,
                                       sizeof(headers) / sizeof(headers[0]),
                                       &data_provider, this);
        if (rv < 0) {
            return Result<void>(ErrorCode::NETWORK_ERROR, "Failed to submit request");
        }

        // Update statistics
        {
            std::lock_guard<std::mutex> lock(stats_mutex_);
            stats_.bytes_sent += data.size();
            stats_.messages_sent++;
            stats_.last_activity = std::chrono::steady_clock::now();
        }

        return Result<void>();
    }

    void run_io_loop() {
        while (!should_stop_.load() && connected_.load()) {
            // Send pending data
            nghttp2_session_send(session_);

            // Receive data
            uint8_t buffer[4096];
            int nread = SSL_read(ssl_, buffer, sizeof(buffer));

            if (nread > 0) {
                nghttp2_session_mem_recv(session_, buffer, nread);

                {
                    std::lock_guard<std::mutex> lock(stats_mutex_);
                    stats_.bytes_received += nread;
                    stats_.last_activity = std::chrono::steady_clock::now();
                }
            } else if (nread == 0) {
                // Connection closed
                break;
            } else {
                int err = SSL_get_error(ssl_, nread);
                if (err != SSL_ERROR_WANT_READ && err != SSL_ERROR_WANT_WRITE) {
                    break;
                }
            }

            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    }

    // nghttp2 callbacks
    static int on_frame_recv(nghttp2_session* session, const nghttp2_frame* frame, void* user_data) {

        switch (frame->hd.type) {
            case NGHTTP2_DATA:
                // Data frame received
                break;
            case NGHTTP2_HEADERS:
                // Headers frame received
                break;
            default:
                break;
        }

        return 0;
    }

    static int on_data_chunk_recv(nghttp2_session* session, uint8_t flags, int32_t stream_id,
                                 const uint8_t* data, size_t len, void* user_data) {
        Impl* impl = static_cast<Impl*>(user_data);

        // Collect data for this stream
        {
            std::lock_guard<std::mutex> lock(impl->streams_mutex_);
            auto it = impl->streams_.find(stream_id);
            if (it != impl->streams_.end()) {
                it->second->data.insert(it->second->data.end(), data, data + len);
            }
        }

        if (flags & NGHTTP2_DATA_FLAG_EOF) {
            // Stream complete, notify callback
            std::lock_guard<std::mutex> lock(impl->streams_mutex_);
            auto it = impl->streams_.find(stream_id);
            if (it != impl->streams_.end()) {
                ByteBuffer received_data = it->second->data;

                {
                    std::lock_guard<std::mutex> cb_lock(impl->callback_mutex_);
                    if (impl->message_callback_) {
                        impl->message_callback_(received_data);
                    }
                }

                {
                    std::lock_guard<std::mutex> stats_lock(impl->stats_mutex_);
                    impl->stats_.messages_received++;
                }

                impl->streams_.erase(it);
            }
        }

        return 0;
    }

    static int on_stream_close(nghttp2_session* session, int32_t stream_id, uint32_t error_code, void* user_data) {
        Impl* impl = static_cast<Impl*>(user_data);

        std::lock_guard<std::mutex> lock(impl->streams_mutex_);
        impl->streams_.erase(stream_id);

        return 0;
    }

    static int on_header(nghttp2_session* session, const nghttp2_frame* frame,
                        const uint8_t* name, size_t namelen, const uint8_t* value,
                        size_t valuelen, uint8_t flags, void* user_data) {
        // Handle headers if needed
        return 0;
    }

    static int on_begin_headers(nghttp2_session* session, const nghttp2_frame* frame, void* user_data) {
        // Begin headers callback
        return 0;
    }
};

HTTP2Transport::HTTP2Transport(const TransportConfig& config)
    : impl_(std::make_unique<Impl>(config)) {
}

HTTP2Transport::~HTTP2Transport() = default;

Result<void> HTTP2Transport::connect() {
    return impl_->connect();
}

Result<void> HTTP2Transport::disconnect() {
    return impl_->disconnect();
}

bool HTTP2Transport::is_connected() const {
    return impl_->connected_.load();
}

Result<void> HTTP2Transport::send(const ByteBuffer& data) {
    return impl_->send(data);
}

Result<void> HTTP2Transport::send_envelope(const Envelope& envelope) {
    // Serialize envelope to JSON
    auto json_result = JsonSerializer::serialize_envelope(envelope);
    if (!json_result.is_success()) {
        return Result<void>(json_result.code, json_result.error_message.value());
    }

    ByteBuffer data(json_result.value->begin(), json_result.value->end());
    return send(data);
}

Result<void> HTTP2Transport::send_frame(const Frame& frame) {
    // Serialize frame to binary format
    auto frame_result = BinarySerializer::serialize_frame(frame);
    if (!frame_result.is_success()) {
        return Result<void>(frame_result.code, frame_result.error_message.value());
    }

    return send(*frame_result.value);
}

Result<void> HTTP2Transport::configure(const TransportConfig& config) {
    impl_->config_ = config;
    impl_->host_ = config.host;
    impl_->port_ = config.port;
    return Result<void>();
}

TransportConfig HTTP2Transport::get_config() const {
    return impl_->config_;
}

void HTTP2Transport::set_message_callback(MessageCallback callback) {
    std::lock_guard<std::mutex> lock(impl_->callback_mutex_);
    impl_->message_callback_ = callback;
}

void HTTP2Transport::set_connection_callback(ConnectionCallback callback) {
    std::lock_guard<std::mutex> lock(impl_->callback_mutex_);
    impl_->connection_callback_ = callback;
}

void HTTP2Transport::set_error_callback(ErrorCallback callback) {
    std::lock_guard<std::mutex> lock(impl_->callback_mutex_);
    impl_->error_callback_ = callback;
}

TransportStats HTTP2Transport::get_stats() const {
    std::lock_guard<std::mutex> lock(impl_->stats_mutex_);
    return impl_->stats_;
}

void HTTP2Transport::reset_stats() {
    std::lock_guard<std::mutex> lock(impl_->stats_mutex_);
    impl_->stats_ = TransportStats{};
    impl_->stats_.last_activity = std::chrono::steady_clock::now();
}

std::string HTTP2Transport::get_endpoint() const {
    return "https://" + impl_->host_ + ":" + std::to_string(impl_->port_) + impl_->path_;
}

} // namespace umicp
