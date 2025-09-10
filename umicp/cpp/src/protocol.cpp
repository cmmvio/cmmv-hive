/**
 * UMICP Protocol Implementation
 * Main protocol orchestrator and message handling
 */

#include "umicp_types.h"
#include "protocol.h"
#include "envelope.h"
#include "frame.h"
#include "transport.h"
#include <chrono>
#include <random>
#include <sstream>
#include <iomanip>

namespace umicp {

Protocol::Protocol(std::string local_id)
    : local_id_(std::move(local_id))
    , config_(UMICPConfig{})
    , stats_{0, 0, 0, 0, 0, std::chrono::steady_clock::now()}
    , next_stream_id_(1) {
}

Protocol::~Protocol() = default;

Result<void> Protocol::configure(const UMICPConfig& config) {
    config_ = config;
    return Result<void>();
}

Result<void> Protocol::set_transport(std::shared_ptr<Transport> transport) {
    if (!transport) {
        return Result<void>(ErrorCode::INVALID_ARGUMENT, "Null transport provided");
    }

    transport_ = transport;

    // Set up transport callbacks (would need to be implemented in Transport interface)
    // transport_->set_message_callback([this](const ByteBuffer& data) {
    //     on_transport_message(data);
    // });

    return Result<void>();
}

Result<void> Protocol::connect() {
    if (!transport_) {
        return Result<void>(ErrorCode::INVALID_ARGUMENT, "No transport configured");
    }

    // Set up transport callbacks before connecting
    transport_->set_message_callback([this](const ByteBuffer& data) {
        on_transport_message(data);
    });

    transport_->set_connection_callback([this](bool connected, const std::string& error) {
        if (connected) {
            on_transport_connected();
        } else {
            on_transport_disconnected();
        }
    });

    transport_->set_error_callback([this](ErrorCode code, const std::string& message) {
        on_transport_error(message);
    });

    auto result = transport_->connect();
    return result;
}

Result<void> Protocol::disconnect() {
    if (!transport_) {
        return Result<void>(ErrorCode::INVALID_ARGUMENT, "No transport configured");
    }

    auto result = transport_->disconnect();
    if (result.is_success()) {
        on_transport_disconnected();
    }

    return result;
}

bool Protocol::is_connected() const {
    return transport_ && transport_->is_connected();
}

Result<std::string> Protocol::send_control(const std::string& to, OperationType op,
                                         const std::string& command, const std::string& params) {
    auto envelope_result = create_envelope(to, op);
    if (!envelope_result.is_success()) {
        return Result<std::string>(envelope_result.code, envelope_result.error_message.value());
    }

    // Add control parameters to envelope
    envelope_result.value->capabilities = StringMap{
        {"command", command}
    };

    if (!params.empty()) {
        if (!envelope_result.value->capabilities) {
            envelope_result.value->capabilities = StringMap();
        }
        (*envelope_result.value->capabilities)["params"] = params;
    }

    auto serialize_result = serialize_message(*envelope_result.value);
    if (!serialize_result.is_success()) {
        return Result<std::string>(serialize_result.code, serialize_result.error_message.value());
    }

    // Send through transport (would be implemented)
    update_stats_sent(serialize_result.value->size());

    return Result<std::string>(envelope_result.value->msg_id);
}

Result<std::string> Protocol::send_data(const std::string& to, const ByteBuffer& data,
                                       const PayloadHint& hint) {
    auto envelope_result = create_envelope(to, OperationType::DATA);
    if (!envelope_result.is_success()) {
        return Result<std::string>(envelope_result.code, envelope_result.error_message.value());
    }

    envelope_result.value->payload_hint = hint;

    auto serialize_result = serialize_message(*envelope_result.value, &data);
    if (!serialize_result.is_success()) {
        return Result<std::string>(serialize_result.code, serialize_result.error_message.value());
    }

    // Send through transport (would be implemented)
    update_stats_sent(serialize_result.value->size());

    return Result<std::string>(envelope_result.value->msg_id);
}

Result<std::string> Protocol::send_ack(const std::string& to, const std::string& message_id) {
    auto envelope_result = create_envelope(to, OperationType::ACK);
    if (!envelope_result.is_success()) {
        return Result<std::string>(envelope_result.code, envelope_result.error_message.value());
    }

    // Add ACK reference
    envelope_result.value->payload_refs = std::vector<JsonObject>{
        JsonObject{{"message_id", message_id}, {"status", "OK"}}
    };

    auto serialize_result = serialize_message(*envelope_result.value);
    if (!serialize_result.is_success()) {
        return Result<std::string>(serialize_result.code, serialize_result.error_message.value());
    }

    update_stats_sent(serialize_result.value->size());
    return Result<std::string>(envelope_result.value->msg_id);
}

Result<std::string> Protocol::send_error(const std::string& to, ErrorCode error,
                                        const std::string& message, const std::string& original_message_id) {
    auto envelope_result = create_envelope(to, OperationType::ERROR);
    if (!envelope_result.is_success()) {
        return Result<std::string>(envelope_result.code, envelope_result.error_message.value());
    }

    // Add error details
    envelope_result.value->payload_refs = std::vector<JsonObject>{
        JsonObject{
            {"error_code", std::to_string(static_cast<int>(error))},
            {"error_message", message}
        }
    };

    if (!original_message_id.empty()) {
        if (envelope_result.value->payload_refs && !envelope_result.value->payload_refs->empty()) {
            (*envelope_result.value->payload_refs)[0]["original_message_id"] = original_message_id;
        }
    }

    auto serialize_result = serialize_message(*envelope_result.value);
    if (!serialize_result.is_success()) {
        return Result<std::string>(serialize_result.code, serialize_result.error_message.value());
    }

    update_stats_sent(serialize_result.value->size());
    return Result<std::string>(envelope_result.value->msg_id);
}

void Protocol::register_handler(OperationType op, MessageHandler handler) {
    handlers_[op] = std::move(handler);
}

void Protocol::unregister_handler(OperationType op) {
    handlers_.erase(op);
}

Result<void> Protocol::process_message(const ByteBuffer& message_data) {
    auto deserialize_result = deserialize_message(message_data);
    if (!deserialize_result.is_success()) {
        update_stats_error();
        return Result<void>(deserialize_result.code, deserialize_result.error_message.value());
    }

    const auto& [envelope, payload] = *deserialize_result.value;
    update_stats_received(message_data.size());

    // Call appropriate handler
    auto it = handlers_.find(envelope.op);
    if (it != handlers_.end()) {
        try {
            it->second(envelope, payload.get());
        } catch (const std::exception& e) {
            update_stats_error();
            return Result<void>(ErrorCode::INVALID_ARGUMENT,
                std::string("Handler exception: ") + e.what());
        }
    }

    return Result<void>();
}

Result<void> Protocol::set_security_manager(std::shared_ptr<SecurityManager> security) {
    if (!security) {
        return Result<void>(ErrorCode::INVALID_ARGUMENT, "Null security manager provided");
    }

    security_ = security;
    return Result<void>();
}

bool Protocol::is_authenticated() const {
    return security_ && security_->authenticated;
}

Protocol::Stats Protocol::get_stats() const {
    return stats_;
}

void Protocol::reset_stats() {
    stats_.messages_sent = 0;
    stats_.messages_received = 0;
    stats_.bytes_sent = 0;
    stats_.bytes_received = 0;
    stats_.errors_count = 0;
    stats_.start_time = std::chrono::steady_clock::now();
}

// Private methods
Result<std::string> Protocol::generate_message_id() {
    auto now = std::chrono::system_clock::now();
    auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()).count();

    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, 999);

    std::stringstream ss;
    ss << "msg-" << timestamp << "-" << std::setfill('0') << std::setw(3) << dis(gen);
    return Result<std::string>(ss.str());
}

Result<Envelope> Protocol::create_envelope(const std::string& to, OperationType op) {
    Envelope envelope;
    envelope.version = config_.version;
    envelope.from = local_id_;
    envelope.to = to;
    envelope.op = op;

    auto msg_id_result = generate_message_id();
    if (!msg_id_result.is_success()) {
        return Result<Envelope>(msg_id_result.code, msg_id_result.error_message.value());
    }

    envelope.msg_id = *msg_id_result.value;

    // Set current timestamp
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::gmtime(&time_t), "%Y-%m-%dT%H:%M:%S");
    ss << "." << std::setfill('0') << std::setw(3)
       << (std::chrono::duration_cast<std::chrono::milliseconds>(
           now.time_since_epoch()).count() % 1000);
    ss << "Z";
    envelope.ts = ss.str();

    return Result<Envelope>(envelope);
}

Result<ByteBuffer> Protocol::serialize_message(const Envelope& envelope, const ByteBuffer* payload) {
    // For now, return a simple serialized version
    // In full implementation, this would handle JSON serialization and framing
    ByteBuffer buffer;
    buffer.reserve(1024);

    // Simple envelope serialization (placeholder)
    std::string envelope_str = "ENVELOPE:" + envelope.msg_id + ":" + envelope.from + ":" + envelope.to;

    buffer.insert(buffer.end(), envelope_str.begin(), envelope_str.end());

    if (payload && !payload->empty()) {
        buffer.push_back('\0'); // Separator
        buffer.insert(buffer.end(), payload->begin(), payload->end());
    }

    return Result<ByteBuffer>(buffer);
}

Result<std::pair<Envelope, std::unique_ptr<ByteBuffer>>> Protocol::deserialize_message(const ByteBuffer& data) {
    // Simple deserialization (placeholder)
    // In full implementation, this would parse JSON and extract payload
    std::string data_str(data.begin(), data.end());
    size_t separator_pos = data_str.find('\0');

    Envelope envelope;
    std::unique_ptr<ByteBuffer> payload;

    if (separator_pos != std::string::npos) {
        std::string envelope_part = data_str.substr(0, separator_pos);
        std::string payload_part = data_str.substr(separator_pos + 1);

        // Parse envelope (simplified)
        // This would use proper JSON parsing in full implementation
        envelope.msg_id = "parsed-msg-id";
        envelope.from = "parsed-from";
        envelope.to = "parsed-to";
        envelope.op = OperationType::DATA;

        payload = std::make_unique<ByteBuffer>(payload_part.begin(), payload_part.end());
    } else {
        // Control message without payload
        envelope.msg_id = "parsed-msg-id";
        envelope.from = "parsed-from";
        envelope.to = "parsed-to";
        envelope.op = OperationType::CONTROL;
    }

    return Result<std::pair<Envelope, std::unique_ptr<ByteBuffer>>>(
        std::make_pair(envelope, std::move(payload)));
}

void Protocol::update_stats_sent(size_t bytes) {
    stats_.messages_sent++;
    stats_.bytes_sent += bytes;
}

void Protocol::update_stats_received(size_t bytes) {
    stats_.messages_received++;
    stats_.bytes_received += bytes;
}

void Protocol::update_stats_error() {
    stats_.errors_count++;
}

void Protocol::on_transport_message(const ByteBuffer& data) {
    auto result = process_message(data);
    if (!result.is_success()) {
        // Handle processing error
    }
}

void Protocol::on_transport_connected() {
    // Handle connection established
}

void Protocol::on_transport_disconnected() {
    // Handle disconnection
}

void Protocol::on_transport_error(const std::string& error) {
    // Handle transport error
    update_stats_error();
}

} // namespace umicp
