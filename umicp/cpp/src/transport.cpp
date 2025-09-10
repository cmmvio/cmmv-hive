/**
 * UMICP Transport Layer Implementation
 * WebSocket and HTTP/2 transport implementations
 */

#include "transport.h"
#include "envelope.h"
#include "frame.h"
#include <iostream>
#include <sstream>
#include <chrono>
#include <thread>
// Include real implementations at global scope to avoid nesting standard headers under namespace umicp
#include "websocket_lws.h"
#include "http2_transport.h"

namespace umicp {

// ===============================================
// WebSocket Transport Implementation
// ===============================================

class WebSocketTransport::Impl {
public:
    TransportConfig config_;
    ::std::atomic<bool> connected_{false};
    ::std::atomic<bool> connecting_{false};
    TransportStats stats_;

    // Callbacks
    MessageCallback message_callback_;
    ConnectionCallback connection_callback_;
    ErrorCallback error_callback_;

    // Threading
    ::std::unique_ptr<::std::thread> io_thread_;
    ::std::atomic<bool> should_stop_{false};
    mutable ::std::mutex callback_mutex_;
    mutable ::std::mutex stats_mutex_;

    explicit Impl(const TransportConfig& config) : config_(config) {
        stats_.last_activity = ::std::chrono::steady_clock::now();
    }

    ~Impl() {
        stop_io_thread();
    }

    Result<void> connect() {
        if (connected_.load()) {
            return Result<void>();
        }

        if (connecting_.load()) {
            return Result<void>(ErrorCode::NETWORK_ERROR, "Connection already in progress");
        }

        connecting_.store(true);

        // For MVP, simulate connection success
        // In real implementation, this would use libwebsockets or similar
        ::std::this_thread::sleep_for(::std::chrono::milliseconds(1));

        connected_.store(true);
        connecting_.store(false);
        stats_.connection_count++;

        // Start I/O thread
        start_io_thread();

        // Notify connection success
        if (connection_callback_) {
            ::std::lock_guard<::std::mutex> lock(callback_mutex_);
            connection_callback_(true, "");
        }

        return Result<void>();
    }

    Result<void> disconnect() {
        if (!connected_.load()) {
            return Result<void>();
        }

        connected_.store(false);
        stop_io_thread();

        // Notify disconnection
        if (connection_callback_) {
            ::std::lock_guard<::std::mutex> lock(callback_mutex_);
            connection_callback_(false, "Disconnected by user");
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

        // For MVP, simulate sending data
        // In real implementation, this would send via WebSocket

        {
            ::std::lock_guard<::std::mutex> lock(stats_mutex_);
            stats_.bytes_sent += data.size();
            stats_.messages_sent++;
            stats_.last_activity = ::std::chrono::steady_clock::now();
        }

        // Simulate network delay
        ::std::this_thread::sleep_for(::std::chrono::milliseconds(1));

        return Result<void>();
    }

private:
    void start_io_thread() {
        // Stop any existing thread first
        stop_io_thread();

        should_stop_.store(false);
        io_thread_ = ::std::make_unique<::std::thread>([this]() {
            run_io_loop();
        });
    }

    void stop_io_thread() {
        should_stop_.store(true);
        if (io_thread_) {
            if (io_thread_->joinable()) {
                io_thread_->join();
            }
            io_thread_.reset();
        }
    }

    void run_io_loop() {
        while (!should_stop_.load() && connected_.load()) {
            // For MVP, simulate receiving heartbeat messages
            ::std::this_thread::sleep_for(::std::chrono::seconds(1));

            if (message_callback_) {
                // Simulate receiving a heartbeat message
                ByteBuffer heartbeat_data;
                ::std::string heartbeat_msg = R"({"type":"heartbeat","timestamp":")" +
                    ::std::to_string(::std::chrono::duration_cast<::std::chrono::milliseconds>(
                        ::std::chrono::system_clock::now().time_since_epoch()).count()) + "\"}";

                heartbeat_data.assign(heartbeat_msg.begin(), heartbeat_msg.end());

                {
                    ::std::lock_guard<::std::mutex> lock(stats_mutex_);
                    stats_.bytes_received += heartbeat_data.size();
                    stats_.messages_received++;
                    stats_.last_activity = ::std::chrono::steady_clock::now();
                }

                {
                    ::std::lock_guard<::std::mutex> lock(callback_mutex_);
                    message_callback_(heartbeat_data);
                }
            }
        }
    }
};

WebSocketTransport::WebSocketTransport(const TransportConfig& config)
    : impl_(::std::make_unique<Impl>(config)) {
}

WebSocketTransport::~WebSocketTransport() = default;

Result<void> WebSocketTransport::connect() {
    return impl_->connect();
}

Result<void> WebSocketTransport::disconnect() {
    return impl_->disconnect();
}

bool WebSocketTransport::is_connected() const {
    return impl_->connected_.load();
}

Result<void> WebSocketTransport::send(const ByteBuffer& data) {
    return impl_->send(data);
}

Result<void> WebSocketTransport::send_envelope(const Envelope& envelope) {
    // Serialize envelope to JSON and send
    // This would use the EnvelopeProcessor in real implementation
    ::std::ostringstream json_stream;
    json_stream << "{"
                << "\"v\":\"" << envelope.version << "\","
                << "\"msg_id\":\"" << envelope.msg_id << "\","
                << "\"ts\":\"" << envelope.ts << "\","
                << "\"from\":\"" << envelope.from << "\","
                << "\"to\":\"" << envelope.to << "\","
                << "\"op\":" << static_cast<int>(envelope.op);

    if (envelope.capabilities) {
        json_stream << ",\"capabilities\":{";
        bool first = true;
        for (const auto& [key, value] : *envelope.capabilities) {
            if (!first) json_stream << ",";
            json_stream << "\"" << key << "\":\"" << value << "\"";
            first = false;
        }
        json_stream << "}";
    }

    json_stream << "}";

    ::std::string json_str = json_stream.str();
    ByteBuffer data(json_str.begin(), json_str.end());

    return send(data);
}

Result<void> WebSocketTransport::send_frame(const Frame& frame) {
    // Serialize frame to binary format
    ByteBuffer data;
    data.reserve(UMICP_FRAME_HEADER_SIZE + frame.payload.size());

    // Serialize header (16 bytes)
    data.push_back(frame.header.version);
    data.push_back(frame.header.type);

    // Flags (2 bytes, little-endian)
    data.push_back(frame.header.flags & 0xFF);
    data.push_back((frame.header.flags >> 8) & 0xFF);

    // Stream ID (8 bytes, little-endian)
    uint64_t stream_id = frame.header.stream_id;
    for (int i = 0; i < 8; ++i) {
        data.push_back((stream_id >> (i * 8)) & 0xFF);
    }

    // Sequence (4 bytes, little-endian)
    uint32_t sequence = frame.header.sequence;
    for (int i = 0; i < 4; ++i) {
        data.push_back((sequence >> (i * 8)) & 0xFF);
    }

    // Length (4 bytes, little-endian)
    uint32_t length = static_cast<uint32_t>(frame.payload.size());
    for (int i = 0; i < 4; ++i) {
        data.push_back((length >> (i * 8)) & 0xFF);
    }

    // Payload
    data.insert(data.end(), frame.payload.begin(), frame.payload.end());

    return send(data);
}

Result<void> WebSocketTransport::configure(const TransportConfig& config) {
    if (is_connected()) {
        return Result<void>(ErrorCode::NETWORK_ERROR, "Cannot configure while connected");
    }

    impl_->config_ = config;
    return Result<void>();
}

TransportConfig WebSocketTransport::get_config() const {
    return impl_->config_;
}

void WebSocketTransport::set_message_callback(MessageCallback callback) {
    ::std::lock_guard<::std::mutex> lock(impl_->callback_mutex_);
    impl_->message_callback_ = callback;
}

void WebSocketTransport::set_connection_callback(ConnectionCallback callback) {
    ::std::lock_guard<::std::mutex> lock(impl_->callback_mutex_);
    impl_->connection_callback_ = callback;
}

void WebSocketTransport::set_error_callback(ErrorCallback callback) {
    ::std::lock_guard<::std::mutex> lock(impl_->callback_mutex_);
    impl_->error_callback_ = callback;
}

TransportStats WebSocketTransport::get_stats() const {
    ::std::lock_guard<::std::mutex> lock(impl_->stats_mutex_);
    TransportStats stats_copy;
    stats_copy.bytes_sent = impl_->stats_.bytes_sent;
    stats_copy.bytes_received = impl_->stats_.bytes_received;
    stats_copy.messages_sent = impl_->stats_.messages_sent;
    stats_copy.messages_received = impl_->stats_.messages_received;
    stats_copy.connection_count = impl_->stats_.connection_count;
    stats_copy.last_activity = impl_->stats_.last_activity;
    return stats_copy;
}

void WebSocketTransport::reset_stats() {
    ::std::lock_guard<::std::mutex> lock(impl_->stats_mutex_);
    impl_->stats_ = TransportStats{};
    impl_->stats_.last_activity = std::chrono::steady_clock::now();
}

::std::string WebSocketTransport::get_endpoint() const {
    const auto& config = impl_->config_;
    return "ws://" + config.host + ":" + ::std::to_string(config.port) + config.path;
}

// ===============================================
// WebSocket and HTTP/2 Transport Implementations
// ===============================================

// (includes moved to global scope above)

// ===============================================
// Transport Factory
// ===============================================

::std::unique_ptr<Transport> TransportFactory::create(TransportType type, const TransportConfig& config) {
    switch (type) {
        case TransportType::WEBSOCKET:
            return create_websocket(config);
        case TransportType::HTTP2:
            return create_http2(config);
        default:
            return nullptr;
    }
}

::std::unique_ptr<Transport> TransportFactory::create(TransportType type, const TransportConfig& config, const UMICPConfig& umicp_config) {
    TransportConfig enhanced_config = apply_umicp_config(config, umicp_config);
    return create(type, enhanced_config);
}

::std::unique_ptr<Transport> TransportFactory::create_websocket(const TransportConfig& config) {
    return ::std::make_unique<WebSocketLWS>(config);
}

::std::unique_ptr<Transport> TransportFactory::create_websocket(const TransportConfig& config, const UMICPConfig& umicp_config) {
    TransportConfig enhanced_config = apply_umicp_config(config, umicp_config);
    return create_websocket(enhanced_config);
}

::std::unique_ptr<Transport> TransportFactory::create_http2(const TransportConfig& config) {
    return ::std::make_unique<HTTP2Transport>(config);
}

::std::unique_ptr<Transport> TransportFactory::create_http2(const TransportConfig& config, const UMICPConfig& umicp_config) {
    TransportConfig enhanced_config = apply_umicp_config(config, umicp_config);
    return create_http2(enhanced_config);
}

TransportConfig TransportFactory::apply_umicp_config(const TransportConfig& transport_config, const UMICPConfig& umicp_config) {
    TransportConfig enhanced_config = transport_config;

    // Apply SSL/TLS configuration based on UMICP config
    if (umicp_config.validate_certificates) {
        if (!enhanced_config.ssl_config) {
            enhanced_config.ssl_config = SSLConfig();
        }

        // Enable SSL if not explicitly configured
        if (!enhanced_config.ssl_config->enable_ssl) {
            enhanced_config.ssl_config->enable_ssl = true;
        }

        // Apply certificate validation settings
        enhanced_config.ssl_config->verify_peer = true;
        enhanced_config.ssl_config->verify_host = true;

        // Set default ports for SSL if using standard ports
        if (enhanced_config.port == 80 && enhanced_config.type == TransportType::WEBSOCKET) {
            enhanced_config.port = 443; // Default HTTPS port
        } else if (enhanced_config.port == 8080 && enhanced_config.type == TransportType::HTTP2) {
            enhanced_config.port = 8443; // Default HTTP/2 SSL port
        }
    }

    return enhanced_config;
}

} // namespace umicp
