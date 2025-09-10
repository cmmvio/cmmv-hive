/**
 * WebSocket Transport Implementation using libwebsockets
 * Real WebSocket implementation for production use
 */

#pragma once

#include "transport.h"
#include <libwebsockets.h>
#include <memory>
#include <string>
#include <thread>
#include <atomic>
#include <mutex>
#include <queue>
#include <condition_variable>

namespace umicp {

// WebSocket Transport implementation using libwebsockets
class WebSocketLWS : public Transport {
public:
    class Impl;
    explicit WebSocketLWS(const std::string& host, int port, const std::string& path = "/");
    explicit WebSocketLWS(const TransportConfig& config);
    ~WebSocketLWS() override;

    // Transport interface implementation
    Result<void> connect() override;
    Result<void> disconnect() override;
    bool is_connected() const override;

    Result<void> send(const ByteBuffer& data) override;
    Result<void> send_envelope(const Envelope& envelope) override;
    Result<void> send_frame(const Frame& frame) override;

    Result<void> configure(const TransportConfig& config) override;
    TransportConfig get_config() const override;

    void set_message_callback(MessageCallback callback) override;
    void set_connection_callback(ConnectionCallback callback) override;
    void set_error_callback(ErrorCallback callback) override;

    TransportStats get_stats() const override;
    void reset_stats() override;

    TransportType get_type() const override { return TransportType::WEBSOCKET; }
    std::string get_endpoint() const override;

private:
    std::unique_ptr<Impl> impl_;
};

} // namespace umicp
