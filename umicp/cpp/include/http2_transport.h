/**
 * HTTP/2 Transport Implementation
 * Real HTTP/2 implementation for production use
 */

#pragma once

#include "transport.h"
#include <nghttp2/nghttp2.h>
#include <memory>
#include <string>
#include <thread>
#include <atomic>
#include <mutex>
#include <queue>
#include <condition_variable>
#include <map>

namespace umicp {

// HTTP/2 Transport implementation using nghttp2
class HTTP2Transport : public Transport {
public:
    explicit HTTP2Transport(const TransportConfig& config);
    ~HTTP2Transport() override;

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

    TransportType get_type() const override { return TransportType::HTTP2; }
    ::std::string get_endpoint() const override;

private:
    class Impl;
    ::std::unique_ptr<Impl> impl_;
};

} // namespace umicp
