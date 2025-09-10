/**
 * UMICP Protocol Header
 * Main protocol orchestrator and message handling
 */

#ifndef UMICP_PROTOCOL_H
#define UMICP_PROTOCOL_H

#include "umicp_types.h"
#include <memory>
#include <functional>
#include <unordered_map>

namespace umicp {

// Forward declarations
class Transport;
class SecurityManager;

// Message handler type
using MessageHandler = std::function<void(const Envelope&, const ByteBuffer*)>;

// Protocol orchestrator class
class Protocol {
public:
    explicit Protocol(std::string local_id);
    ~Protocol();

    // Configuration
    Result<void> configure(const UMICPConfig& config);

    // Transport management
    Result<void> set_transport(std::shared_ptr<Transport> transport);
    Result<void> connect();
    Result<void> disconnect();
    bool is_connected() const;

    // Message sending
    Result<std::string> send_control(const std::string& to, OperationType op, const std::string& command,
                                   const std::string& params = "");
    Result<std::string> send_data(const std::string& to, const ByteBuffer& data,
                                const PayloadHint& hint = PayloadHint());
    Result<std::string> send_ack(const std::string& to, const std::string& message_id);
    Result<std::string> send_error(const std::string& to, ErrorCode error, const std::string& message,
                                 const std::string& original_message_id = "");

    // Message handling
    void register_handler(OperationType op, MessageHandler handler);
    void unregister_handler(OperationType op);
    Result<void> process_message(const ByteBuffer& message_data);

    // Security
    Result<void> set_security_manager(std::shared_ptr<SecurityManager> security);
    bool is_authenticated() const;

    // Statistics and monitoring
    struct Stats {
        size_t messages_sent;
        size_t messages_received;
        size_t bytes_sent;
        size_t bytes_received;
        size_t errors_count;
        std::chrono::steady_clock::time_point start_time;
    };

    Stats get_stats() const;
    void reset_stats();

private:
    std::string local_id_;
    UMICPConfig config_;
    std::shared_ptr<Transport> transport_;
    std::shared_ptr<SecurityManager> security_;
    std::unordered_map<OperationType, MessageHandler> handlers_;
    Stats stats_;
    uint64_t next_stream_id_;

    // Internal methods
    Result<std::string> generate_message_id();
    Result<Envelope> create_envelope(const std::string& to, OperationType op);
    Result<ByteBuffer> serialize_message(const Envelope& envelope, const ByteBuffer* payload = nullptr);
    Result<std::pair<Envelope, std::unique_ptr<ByteBuffer>>> deserialize_message(const ByteBuffer& data);

    void update_stats_sent(size_t bytes);
    void update_stats_received(size_t bytes);
    void update_stats_error();

    // Transport callback
    void on_transport_message(const ByteBuffer& data);
    void on_transport_connected();
    void on_transport_disconnected();
    void on_transport_error(const std::string& error);
};

} // namespace umicp

#endif // UMICP_PROTOCOL_H
