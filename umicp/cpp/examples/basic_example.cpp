/**
 * UMICP C++ Core - Basic Usage Example
 * Demonstrates envelope and frame operations
 */

#include "../include/umicp_types.h"
#include "../include/envelope.h"
#include "../include/frame.h"
#include "../include/matrix_ops.h"
#include <iostream>
#include <vector>
#include <chrono>

using namespace umicp;

int main() {
    std::cout << "🚀 UMICP C++ Core - Basic Example" << std::endl;
    std::cout << "=====================================" << std::endl;

    // Example 1: Envelope Operations
    std::cout << "\n📝 Example 1: Envelope Operations" << std::endl;
    std::cout << "----------------------------------" << std::endl;

    // Create envelope using builder pattern
    auto envelope_result = EnvelopeBuilder()
        .from("ai-model-a")
        .to("ai-model-b")
        .operation(OperationType::DATA)
        .capabilities({
            {"binary_support", "true"},
            {"compression", "gzip,brotli"},
            {"formats", "cbor,msgpack"}
        })
        .payload_hint(PayloadHint{
            PayloadType::VECTOR,
            1024, // size
            EncodingType::FLOAT32,
            256  // count
        })
        .build();

    if (!envelope_result.is_success()) {
        std::cerr << "Failed to build envelope: " << envelope_result.error_message.value_or("Unknown error") << std::endl;
        return 1;
    }

    Envelope envelope = envelope_result.value.value();

    // Serialize envelope to JSON
    auto serialize_result = EnvelopeProcessor::serialize(envelope);
    if (serialize_result.is_success()) {
        std::cout << "✅ Envelope serialized successfully" << std::endl;
        std::cout << "📄 JSON length: " << serialize_result.value->length() << " bytes" << std::endl;

        // Deserialize back
        auto deserialize_result = EnvelopeProcessor::deserialize(*serialize_result.value);
        if (deserialize_result.is_success()) {
            std::cout << "✅ Envelope deserialized successfully" << std::endl;
            std::cout << "📨 From: " << deserialize_result.value->from << std::endl;
            std::cout << "📨 To: " << deserialize_result.value->to << std::endl;
        }
    }

    // Example 2: Frame Operations
    std::cout << "\n📦 Example 2: Frame Operations" << std::endl;
    std::cout << "-------------------------------" << std::endl;

    // Create some sample data (simulating embeddings)
    std::vector<float> embeddings(768);
    for (size_t i = 0; i < embeddings.size(); ++i) {
        embeddings[i] = static_cast<float>(i) * 0.01f;
    }

    // Create frame with binary data
    ByteBuffer payload_data(embeddings.size() * sizeof(float));
    std::memcpy(payload_data.data(), embeddings.data(), payload_data.size());

    auto frame_result = FrameBuilder()
        .type(1) // Data frame
        .stream_id(42)
        .sequence(1)
        .payload(payload_data)
        .compressed(FrameFlags::COMPRESSED_GZIP)
        .build();

    if (!frame_result.is_success()) {
        std::cerr << "Failed to build frame: " << frame_result.error_message.value_or("Unknown error") << std::endl;
        return 1;
    }

    Frame frame = frame_result.value.value();

    // Serialize frame
    auto frame_serialize_result = FrameProcessor::serialize(frame);
    if (frame_serialize_result.is_success()) {
        std::cout << "✅ Frame serialized successfully" << std::endl;
        std::cout << "📦 Frame size: " << frame_serialize_result.value->size() << " bytes" << std::endl;
        std::cout << "🔢 Frame type: " << static_cast<int>(frame.header.type) << std::endl;
        std::cout << "🆔 Stream ID: " << frame.header.stream_id << std::endl;
        std::cout << "📊 Sequence: " << frame.header.sequence << std::endl;
        std::cout << "🏷️  Flags: " << frame.header.flags << std::endl;
        std::cout << "📏 Payload length: " << frame.header.length << " bytes" << std::endl;
    }

    // Example 3: Matrix Operations
    std::cout << "\n🧮 Example 3: Matrix Operations" << std::endl;
    std::cout << "-------------------------------" << std::endl;

    // Create sample matrices
    const size_t rows = 100;
    const size_t cols = 768;
    std::vector<float> matrix_a(rows * cols);
    std::vector<float> matrix_b(rows * cols);
    std::vector<float> result_matrix(rows * cols);

    // Initialize with sample data
    for (size_t i = 0; i < matrix_a.size(); ++i) {
        matrix_a[i] = static_cast<float>(i % 100) * 0.1f;
        matrix_b[i] = static_cast<float>((i + 50) % 100) * 0.1f;
    }

    // Matrix addition
    auto start_time = std::chrono::high_resolution_clock::now();
    auto add_result = MatrixOps::add(matrix_a.data(), matrix_b.data(), result_matrix.data(), rows, cols);
    auto end_time = std::chrono::high_resolution_clock::now();

    if (add_result.is_success()) {
        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end_time - start_time);
        std::cout << "✅ Matrix addition completed in " << duration.count() << " μs" << std::endl;
        std::cout << "📊 Matrix size: " << rows << "x" << cols << " (" << (rows * cols) << " elements)" << std::endl;
    }

    // Vector normalization
    start_time = std::chrono::high_resolution_clock::now();
    auto normalize_result = MatrixOps::normalize(result_matrix.data(), rows, cols);
    end_time = std::chrono::high_resolution_clock::now();

    if (normalize_result.is_success()) {
        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end_time - start_time);
        std::cout << "✅ Matrix normalization completed in " << duration.count() << " μs" << std::endl;
    }

    // Dot product example
    std::vector<float> vec_a = {1.0f, 2.0f, 3.0f, 4.0f, 5.0f};
    std::vector<float> vec_b = {5.0f, 4.0f, 3.0f, 2.0f, 1.0f};
    float dot_result = 0.0f;

    auto dot_product_result = MatrixOps::dot_product(vec_a.data(), vec_b.data(), &dot_result, vec_a.size());
    if (dot_product_result.is_success()) {
        std::cout << "✅ Dot product: " << dot_result << std::endl;
    }

    // Cosine similarity
    float cos_sim = 0.0f;
    auto cos_sim_result = MatrixOps::cosine_similarity(vec_a.data(), vec_b.data(), &cos_sim, vec_a.size());
    if (cos_sim_result.is_success()) {
        std::cout << "✅ Cosine similarity: " << cos_sim << std::endl;
    }

    // Example 4: Performance Comparison
    std::cout << "\n⚡ Example 4: Performance Comparison" << std::endl;
    std::cout << "-----------------------------------" << std::endl;

    const size_t perf_size = 10000;
    std::vector<float> perf_a(perf_size);
    std::vector<float> perf_b(perf_size);
    std::vector<float> perf_result(perf_size);

    // Initialize test data
    for (size_t i = 0; i < perf_size; ++i) {
        perf_a[i] = static_cast<float>(i) * 0.001f;
        perf_b[i] = static_cast<float>(i % 10) * 0.1f;
    }

    // Time the operations
    start_time = std::chrono::high_resolution_clock::now();
    for (int iter = 0; iter < 100; ++iter) {
        MatrixOps::add(perf_a.data(), perf_b.data(), perf_result.data(), perf_size, 1);
    }
    end_time = std::chrono::high_resolution_clock::now();

    auto total_duration = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time);
    std::cout << "⏱️  100 vector additions (" << perf_size << " elements each): " << total_duration.count() << " ms" << std::endl;
    std::cout << "📈 Average time per addition: " << (total_duration.count() / 100.0) << " ms" << std::endl;

    std::cout << "\n🎉 UMICP C++ Core Example Completed Successfully!" << std::endl;
    std::cout << "==================================================" << std::endl;

    return 0;
}
