/**
 * WebSocket Transport Implementation using libwebsockets
 * Real WebSocket implementation for production use
 */

#include "websocket_lws.h"
#include "serialization.h"
#include <libwebsockets.h>
#include <iostream>
#include <thread>
#include <atomic>
#include <mutex>
#include <queue>
#include <condition_variable>

namespace umicp {

// Forward declarations
static int websocket_callback(struct lws* wsi, enum lws_callback_reasons reason,
                             void* user, void* in, size_t len);

// WebSocket context and connection management
struct WebSocketLWSImpl {
    struct lws_context* context;
    struct lws* wsi;
    std::string host;
    int port;
    std::string path;
    bool connected;
    std::atomic<bool> should_stop;

    // Threading
    std::thread io_thread;
    std::mutex send_mutex;
    std::queue<ByteBuffer> send_queue;
    std::condition_variable send_cv;

    // Callbacks
    MessageCallback message_callback;
    ConnectionCallback connection_callback;
    ErrorCallback error_callback;
    std::mutex callback_mutex;

    // Statistics
    TransportStats stats;
    std::mutex stats_mutex;

    WebSocketLWSImpl(const std::string& host, int port, const std::string& path = "/")
        : context(nullptr), wsi(nullptr), host(host), port(port), path(path),
          connected(false), should_stop(false) {
        stats.last_activity = std::chrono::steady_clock::now();
    }

    ~WebSocketLWSImpl() {
        should_stop.store(true);
        if (io_thread.joinable()) {
            io_thread.join();
        }
        if (context) {
            lws_context_destroy(context);
        }
    }
};

// Global instance for callback access (in production, use proper context passing)
static WebSocketLWSImpl* g_impl = nullptr;

// WebSocket callback function
static int websocket_callback(struct lws* wsi, enum lws_callback_reasons reason,
                             void* user, void* in, size_t len) {
    if (!g_impl) return 0;

    switch (reason) {
        case LWS_CALLBACK_CLIENT_ESTABLISHED:
            {
                std::lock_guard<std::mutex> lock(g_impl->callback_mutex);
                g_impl->connected = true;
                if (g_impl->connection_callback) {
                    g_impl->connection_callback(true, "");
                }
            }
            break;

        case LWS_CALLBACK_CLIENT_RECEIVE:
            {
                ByteBuffer data(static_cast<const uint8_t*>(in),
                               static_cast<const uint8_t*>(in) + len);

                {
                    std::lock_guard<std::mutex> lock(g_impl->stats_mutex);
                    g_impl->stats.bytes_received += data.size();
                    g_impl->stats.messages_received++;
                    g_impl->stats.last_activity = std::chrono::steady_clock::now();
                }

                {
                    std::lock_guard<std::mutex> lock(g_impl->callback_mutex);
                    if (g_impl->message_callback) {
                        g_impl->message_callback(data);
                    }
                }
            }
            break;

        case LWS_CALLBACK_CLIENT_WRITEABLE:
            {
                std::unique_lock<std::mutex> lock(g_impl->send_mutex);
                if (!g_impl->send_queue.empty()) {
                    ByteBuffer data = g_impl->send_queue.front();
                    g_impl->send_queue.pop();
                    lock.unlock();

                    // Send data
                    unsigned char buf[LWS_PRE + data.size()];
                    memcpy(&buf[LWS_PRE], data.data(), data.size());

                    int ret = lws_write(wsi, &buf[LWS_PRE], data.size(), LWS_WRITE_TEXT);
                    if (ret < 0) {
                        std::lock_guard<std::mutex> cb_lock(g_impl->callback_mutex);
                        if (g_impl->error_callback) {
                            g_impl->error_callback(ErrorCode::NETWORK_ERROR, "Write failed");
                        }
                    } else {
                        std::lock_guard<std::mutex> stats_lock(g_impl->stats_mutex);
                        g_impl->stats.bytes_sent += data.size();
                        g_impl->stats.messages_sent++;
                        g_impl->stats.last_activity = std::chrono::steady_clock::now();
                    }

                    // Request another write callback if there's more data
                    lws_callback_on_writable(wsi);
                }
            }
            break;

        case LWS_CALLBACK_CLIENT_CLOSED:
            {
                std::lock_guard<std::mutex> lock(g_impl->callback_mutex);
                g_impl->connected = false;
                if (g_impl->connection_callback) {
                    g_impl->connection_callback(false, "Connection closed");
                }
            }
            break;

        case LWS_CALLBACK_CLIENT_CONNECTION_ERROR:
            {
                std::lock_guard<std::mutex> lock(g_impl->callback_mutex);
                g_impl->connected = false;
                if (g_impl->error_callback) {
                    g_impl->error_callback(ErrorCode::NETWORK_ERROR, "Connection error");
                }
            }
            break;

        default:
            break;
    }

    return 0;
}

// Protocol definition
static struct lws_protocols protocols[] = {
    {
        "umicp-protocol",
        websocket_callback,
        0,
        4096,  // rx_buffer_size
        0,     // id
        nullptr, // user
        0      // per_session_data_size
    },
    { nullptr, nullptr, 0, 0, 0, nullptr, 0 } // terminator
};

WebSocketLWS::WebSocketLWS(const std::string& host, int port, const std::string& path)
    : impl_(std::make_unique<WebSocketLWSImpl>(host, port, path)) {
}

// Constructor from TransportConfig
WebSocketLWS::WebSocketLWS(const TransportConfig& config)
    : impl_(std::make_unique<WebSocketLWSImpl>(config.host, config.port, config.path)) {
}

WebSocketLWS::~WebSocketLWS() = default;

Result<void> WebSocketLWS::connect() {
    if (impl_->connected) {
        return Result<void>(ErrorCode::INVALID_ARGUMENT, "Already connected");
    }

    // Set global instance for callbacks
    g_impl = impl_.get();

    // Create libwebsockets context
    struct lws_context_creation_info info;
    memset(&info, 0, sizeof(info));

    info.port = CONTEXT_PORT_NO_LISTEN;
    info.protocols = protocols;
    info.gid = -1;
    info.uid = -1;
    info.options = LWS_SERVER_OPTION_DO_SSL_GLOBAL_INIT;

    impl_->context = lws_create_context(&info);
    if (!impl_->context) {
        return Result<void>(ErrorCode::NETWORK_ERROR, "Failed to create WebSocket context");
    }

    // Create connection info
    struct lws_client_connect_info ccinfo;
    memset(&ccinfo, 0, sizeof(ccinfo));

    ccinfo.context = impl_->context;
    ccinfo.address = impl_->host.c_str();
    ccinfo.port = impl_->port;
    ccinfo.path = impl_->path.c_str();
    ccinfo.host = impl_->host.c_str();
    ccinfo.origin = impl_->host.c_str();
    ccinfo.protocol = protocols[0].name;
    ccinfo.ietf_version_or_minus_one = -1;

    impl_->wsi = lws_client_connect_via_info(&ccinfo);
    if (!impl_->wsi) {
        lws_context_destroy(impl_->context);
        impl_->context = nullptr;
        return Result<void>(ErrorCode::NETWORK_ERROR, "Failed to create WebSocket connection");
    }

    // Start I/O thread
    impl_->io_thread = std::thread([this]() {
        while (!impl_->should_stop.load() && impl_->context) {
            lws_service(impl_->context, 50); // 50ms timeout
        }
    });

    // Wait for connection to be established
    auto start = std::chrono::steady_clock::now();
    while (!impl_->connected &&
           std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::steady_clock::now() - start).count() < 5000) {
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }

    if (!impl_->connected) {
        impl_->should_stop.store(true);
        if (impl_->io_thread.joinable()) {
            impl_->io_thread.join();
        }
        lws_context_destroy(impl_->context);
        impl_->context = nullptr;
        return Result<void>(ErrorCode::TIMEOUT, "Connection timeout");
    }

    impl_->stats.connection_count++;
    return Result<void>();
}

Result<void> WebSocketLWS::disconnect() {
    if (!impl_->connected) {
        return Result<void>();
    }

    impl_->should_stop.store(true);
    impl_->connected = false;

    if (impl_->io_thread.joinable()) {
        impl_->io_thread.join();
    }

    if (impl_->context) {
        lws_context_destroy(impl_->context);
        impl_->context = nullptr;
    }

    return Result<void>();
}

bool WebSocketLWS::is_connected() const {
    return impl_->connected;
}

Result<void> WebSocketLWS::send(const ByteBuffer& data) {
    if (!impl_->connected) {
        return Result<void>(ErrorCode::NETWORK_ERROR, "Not connected");
    }

    if (data.empty()) {
        return Result<void>(ErrorCode::INVALID_ARGUMENT, "Data cannot be empty");
    }

    {
        std::lock_guard<std::mutex> lock(impl_->send_mutex);
        impl_->send_queue.push(data);
    }

    impl_->send_cv.notify_one();
    lws_callback_on_writable(impl_->wsi);

    return Result<void>();
}

void WebSocketLWS::set_message_callback(MessageCallback callback) {
    std::lock_guard<std::mutex> lock(impl_->callback_mutex);
    impl_->message_callback = callback;
}

void WebSocketLWS::set_connection_callback(ConnectionCallback callback) {
    std::lock_guard<std::mutex> lock(impl_->callback_mutex);
    impl_->connection_callback = callback;
}

void WebSocketLWS::set_error_callback(ErrorCallback callback) {
    std::lock_guard<std::mutex> lock(impl_->callback_mutex);
    impl_->error_callback = callback;
}

TransportStats WebSocketLWS::get_stats() const {
    std::lock_guard<std::mutex> lock(impl_->stats_mutex);
    return impl_->stats;
}

void WebSocketLWS::reset_stats() {
    std::lock_guard<std::mutex> lock(impl_->stats_mutex);
    impl_->stats = TransportStats{};
    impl_->stats.last_activity = std::chrono::steady_clock::now();
}

std::string WebSocketLWS::get_endpoint() const {
    return "ws://" + impl_->host + ":" + std::to_string(impl_->port) + impl_->path;
}

} // namespace umicp
