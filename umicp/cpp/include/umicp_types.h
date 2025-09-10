/**
 * UMICP (Universal Matrix Intelligent Communication Protocol) - C++ Core
 * Type definitions and constants
 *
 * Based on BIP-05 specifications
 */

#ifndef UMICP_TYPES_H
#define UMICP_TYPES_H

#include <cstdint>
#include <string>
#include <vector>
#include <unordered_map>
#include <memory>
#include <optional>

namespace umicp {

// Protocol constants
static constexpr uint8_t UMICP_VERSION_MAJOR = 1;
static constexpr uint8_t UMICP_VERSION_MINOR = 0;
static constexpr size_t UMICP_FRAME_HEADER_SIZE = 16;
static constexpr size_t UMICP_MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB
static constexpr size_t UMICP_DEFAULT_BUFFER_SIZE = 4096;

// Operation types
enum class OperationType {
    CONTROL = 0,
    DATA = 1,
    ACK = 2,
    ERROR = 3
};

// Content types
enum class ContentType {
    JSON = 0,
    CBOR = 1,
    MSGPACK = 2
};

// Payload types
enum class PayloadType {
    VECTOR = 0,
    TEXT = 1,
    METADATA = 2,
    BINARY = 3
};

// Encoding types
enum class EncodingType {
    FLOAT32 = 0,
    FLOAT64 = 1,
    INT32 = 2,
    INT64 = 3,
    UINT8 = 4,
    UINT16 = 5,
    UINT32 = 6,
    UINT64 = 7
};

// Frame flags bitmask
enum FrameFlags : uint16_t {
    COMPRESSED_GZIP = 1 << 0,
    COMPRESSED_BROTLI = 1 << 1,
    ENCRYPTED_XCHACHA20 = 1 << 2,
    FRAGMENT_START = 1 << 3,
    FRAGMENT_CONTINUE = 1 << 4,
    FRAGMENT_END = 1 << 5,
    STREAM_START = 1 << 6,
    STREAM_END = 1 << 7
};

// Transport types
enum class TransportType {
    WEBSOCKET = 0,
    HTTP2 = 1,
    MATRIX = 2,
    DIRECT = 3
};

// Error codes
enum class ErrorCode {
    SUCCESS = 0,
    INVALID_ENVELOPE = 1,
    INVALID_FRAME = 2,
    AUTHENTICATION_FAILED = 3,
    DECRYPTION_FAILED = 4,
    COMPRESSION_FAILED = 5,
    SERIALIZATION_FAILED = 6,
    NETWORK_ERROR = 7,
    TIMEOUT = 8,
    BUFFER_OVERFLOW = 9
};

// Forward declarations
struct Envelope;
struct Frame;
struct SecurityContext;
struct TransportConfig;
struct UMICPConfig;

// Type aliases
using ByteBuffer = std::vector<uint8_t>;
using StringMap = std::unordered_map<std::string, std::string>;
using JsonObject = std::unordered_map<std::string, std::string>; // Simplified for MVP

// Envelope structure (JSON control plane)
struct Envelope {
    std::string version;
    std::string msg_id;
    std::string ts;
    std::string from;
    std::string to;
    OperationType op;
    std::optional<StringMap> capabilities;
    std::optional<std::string> schema_uri;
    std::optional<std::vector<std::string>> accept;
    std::optional<JsonObject> payload_hint;
    std::optional<std::vector<JsonObject>> payload_refs;

    Envelope() : op(OperationType::CONTROL) {}
};

// Frame header (16 bytes)
struct FrameHeader {
    uint8_t version;
    uint8_t type;
    uint16_t flags;
    uint64_t stream_id;
    uint32_t sequence;
    uint32_t length;
};

// Binary frame structure (data plane)
struct Frame {
    FrameHeader header;
    ByteBuffer payload;

    Frame() = default;
    Frame(FrameHeader hdr, ByteBuffer data)
        : header(hdr), payload(std::move(data)) {}
};

// Payload hint structure
struct PayloadHint {
    PayloadType type;
    std::optional<size_t> size;
    std::optional<EncodingType> encoding;
    std::optional<size_t> count;

    PayloadHint() : type(PayloadType::METADATA) {}
};

// Security context
struct SecurityContext {
    std::string local_id;
    std::optional<std::string> remote_id;
    bool authenticated;
    std::optional<ByteBuffer> encryption_key;
    std::optional<ByteBuffer> signing_key;
    std::optional<ByteBuffer> peer_public_key;
    std::optional<std::string> session_id;

    SecurityContext(std::string id) : local_id(id), authenticated(false) {}
};

// Configuration structure
struct UMICPConfig {
    std::string version;
    size_t max_message_size;
    uint32_t connection_timeout;
    uint32_t heartbeat_interval;
    bool enable_binary;
    ContentType preferred_format;
    bool enable_compression;
    size_t compression_threshold;
    bool require_auth;
    bool require_encryption;
    bool validate_certificates;

    UMICPConfig()
        : version("1.0")
        , max_message_size(UMICP_MAX_MESSAGE_SIZE)
        , connection_timeout(30000)
        , heartbeat_interval(30000)
        , enable_binary(true)
        , preferred_format(ContentType::CBOR)
        , enable_compression(true)
        , compression_threshold(1024)
        , require_auth(true)
        , require_encryption(false)
        , validate_certificates(true)
    {}
};

// Transport configuration
struct TransportConfig {
    TransportType type;
    std::string host;
    uint16_t port;
    std::string path;
    StringMap headers;
    std::optional<size_t> max_payload_size;

    TransportConfig()
        : type(TransportType::WEBSOCKET)
        , host("localhost")
        , port(8080)
        , max_payload_size(UMICP_MAX_MESSAGE_SIZE)
    {}
};

// Result structure for operations
template<typename T>
struct Result {
    ErrorCode code;
    std::optional<T> value;
    std::optional<std::string> error_message;

    Result() : code(ErrorCode::SUCCESS) {}
    Result(T val) : code(ErrorCode::SUCCESS), value(std::move(val)) {}
    Result(ErrorCode err, std::string msg)
        : code(err), error_message(std::move(msg)) {}

    bool is_success() const { return code == ErrorCode::SUCCESS; }
    bool has_value() const { return value.has_value(); }
};

} // namespace umicp

#endif // UMICP_TYPES_H
