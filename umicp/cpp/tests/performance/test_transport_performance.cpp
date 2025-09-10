/**
 * UMICP Transport Performance Tests
 * Performance benchmarking for transport layer operations
 */

#include <gtest/gtest.h>
#include "transport.h"
#include "../utils/test_helpers.h"
#include <thread>
#include <future>
#include <atomic>

using namespace umicp;
using namespace umicp::testing;

class TransportPerformanceTest : public UMICPPerformanceTest {
protected:
    void SetUp() override {
        UMICPPerformanceTest::SetUp();

        config_ = TestHelpers::create_test_transport_config(TransportType::WEBSOCKET, 8090);

        // Various message sizes for testing
        message_sizes_ = {64, 256, 1024, 4096, 16384, 65536}; // 64B to 64KB

        // Pre-generate test messages
        for (size_t size : message_sizes_) {
            test_messages_[size] = TestHelpers::generate_random_data(size);
        }

        test_envelope_ = TestHelpers::create_test_envelope("perf-sender", "perf-receiver");
    }

    TransportConfig config_;
    std::vector<size_t> message_sizes_;
    std::map<size_t, ByteBuffer> test_messages_;
    Envelope test_envelope_;
};

// ===============================================
// Connection Performance Tests
// ===============================================

TEST_F(TransportPerformanceTest, Connection_EstablishmentSpeed) {
    std::cout << "\n  📊 Connection Establishment Performance:" << std::endl;

    const int num_connections = 100;

    auto connection_time = TestHelpers::benchmark_function([&]() {
        for (int i = 0; i < num_connections; ++i) {
            auto transport = TransportFactory::create_websocket(config_);
            transport->connect();
            transport->disconnect();
        }
    }, 1);

    double connections_per_second = (num_connections * 1000000.0) / connection_time;
    double time_per_connection = connection_time / num_connections;

    PrintResults("Connection Cycle", time_per_connection);

    std::cout << "    Rate: " << std::fixed << std::setprecision(1) << connections_per_second
              << " connections/s" << std::endl;

    // Should be able to establish connections reasonably quickly
    EXPECT_LT(time_per_connection, 10000.0); // 10ms per connection for mock
}

TEST_F(TransportPerformanceTest, Connection_ConcurrentConnections) {
    std::cout << "\n  📊 Concurrent Connection Performance:" << std::endl;

    const int num_concurrent = 50;
    std::vector<std::unique_ptr<Transport>> transports;
    std::vector<std::future<void>> futures;

    // Create transports
    for (int i = 0; i < num_concurrent; ++i) {
        auto config = config_;
        config.port = 8100 + i; // Different ports
        transports.push_back(TransportFactory::create_websocket(config));
    }

    auto connect_time = TestHelpers::benchmark_function([&]() {
        // Connect all concurrently
        for (auto& transport : transports) {
            futures.push_back(std::async(std::launch::async, [&transport]() {
                transport->connect();
            }));
        }

        // Wait for all to complete
        for (auto& future : futures) {
            future.wait();
        }
        futures.clear();
    }, 1);

    PrintResults("Concurrent Connections", connect_time);

    std::cout << "    " << num_concurrent << " concurrent connections in "
              << TestHelpers::format_duration(connect_time) << std::endl;

    // Cleanup
    for (auto& transport : transports) {
        transport->disconnect();
    }
}

// ===============================================
// Message Sending Performance Tests
// ===============================================

TEST_F(TransportPerformanceTest, Sending_MessageSizeScaling) {
    std::cout << "\n  📊 Message Size Performance Scaling:" << std::endl;
    std::cout << "    Size      |  Time (μs)  | Throughput (MB/s) | Messages/s" << std::endl;
    std::cout << "    ----------|-------------|-------------------|------------" << std::endl;

    auto transport = TransportFactory::create_websocket(config_);
    ASSERT_TRUE(transport->connect().is_success());

    for (size_t size : message_sizes_) {
        const auto& message = test_messages_[size];

        auto send_time = TestHelpers::benchmark_function([&]() {
            transport->send(message);
        }, 1000);

        double throughput_mbps = (size * 1000000.0) / (send_time * 1024.0 * 1024.0);
        double messages_per_second = 1000000.0 / send_time;

        std::cout << "    " << std::setw(8) << TestHelpers::format_bytes(size)
                  << " | " << std::setw(10) << std::fixed << std::setprecision(2) << send_time
                  << " | " << std::setw(16) << std::setprecision(3) << throughput_mbps
                  << " | " << std::setw(10) << std::setprecision(1) << messages_per_second
                  << std::endl;
    }
}

TEST_F(TransportPerformanceTest, Sending_EnvelopeVsRawData) {
    std::cout << "\n  📊 Envelope vs Raw Data Performance:" << std::endl;

    auto transport = TransportFactory::create_websocket(config_);
    ASSERT_TRUE(transport->connect().is_success());

    const size_t test_size = 1024;
    const auto& raw_data = test_messages_[test_size];

    // Raw data sending
    auto raw_time = TestHelpers::benchmark_function([&]() {
        transport->send(raw_data);
    }, 1000);

    // Envelope sending
    auto envelope_time = TestHelpers::benchmark_function([&]() {
        transport->send_envelope(test_envelope_);
    }, 1000);

    PrintResults("Raw Data Send", raw_time);
    PrintResults("Envelope Send", envelope_time);

    double overhead_factor = envelope_time / raw_time;
    std::cout << "    Envelope overhead: " << std::fixed << std::setprecision(2)
              << overhead_factor << "x (" << std::setprecision(1)
              << ((overhead_factor - 1.0) * 100.0) << "% slower)" << std::endl;
}

TEST_F(TransportPerformanceTest, Sending_BinaryFrameVsJSON) {
    std::cout << "\n  📊 Binary Frame vs JSON Performance:" << std::endl;

    auto transport = TransportFactory::create_websocket(config_);
    ASSERT_TRUE(transport->connect().is_success());

    // Create test frame with payload
    ByteBuffer frame_payload = test_messages_[1024];
    Frame test_frame = TestHelpers::create_test_frame(1001, 1, frame_payload);

    // Binary frame sending
    auto frame_time = TestHelpers::benchmark_function([&]() {
        transport->send_frame(test_frame);
    }, 1000);

    // JSON envelope sending (equivalent data)
    auto json_time = TestHelpers::benchmark_function([&]() {
        transport->send_envelope(test_envelope_);
    }, 1000);

    PrintResults("Binary Frame", frame_time);
    PrintResults("JSON Envelope", json_time);

    double efficiency_factor = json_time / frame_time;
    std::cout << "    Binary efficiency: " << std::fixed << std::setprecision(2)
              << efficiency_factor << "x faster than JSON" << std::endl;
}

// ===============================================
// Throughput Tests
// ===============================================

TEST_F(TransportPerformanceTest, Throughput_SustainedSending) {
    std::cout << "\n  📊 Sustained Throughput Test:" << std::endl;

    auto transport = TransportFactory::create_websocket(config_);
    ASSERT_TRUE(transport->connect().is_success());

    const int num_messages = 1000;
    const size_t message_size = 4096; // 4KB messages
    const auto& test_message = test_messages_[message_size];

    auto total_time = TestHelpers::benchmark_function([&]() {
        for (int i = 0; i < num_messages; ++i) {
            transport->send(test_message);
        }
    }, 1);

    size_t total_bytes = num_messages * message_size;
    double throughput_mbps = (total_bytes * 1000000.0) / (total_time * 1024.0 * 1024.0);
    double messages_per_second = (num_messages * 1000000.0) / total_time;

    PrintResults("Sustained Send", total_time, num_messages);

    std::cout << "    Total: " << TestHelpers::format_bytes(total_bytes) << " in "
              << TestHelpers::format_duration(total_time) << std::endl;
    std::cout << "    Throughput: " << std::fixed << std::setprecision(2) << throughput_mbps
              << " MB/s (" << std::setprecision(1) << messages_per_second << " msg/s)" << std::endl;

    // Verify statistics
    auto stats = transport->get_stats();
    EXPECT_EQ(stats.messages_sent, num_messages);
    EXPECT_GE(stats.bytes_sent, total_bytes);
}

TEST_F(TransportPerformanceTest, Throughput_BurstSending) {
    std::cout << "\n  📊 Burst Sending Performance:" << std::endl;

    auto transport = TransportFactory::create_websocket(config_);
    ASSERT_TRUE(transport->connect().is_success());

    std::vector<size_t> burst_sizes = {10, 50, 100, 500};
    const size_t message_size = 1024;
    const auto& test_message = test_messages_[message_size];

    for (size_t burst_size : burst_sizes) {
        auto burst_time = TestHelpers::benchmark_function([&]() {
            for (size_t i = 0; i < burst_size; ++i) {
                transport->send(test_message);
            }
        }, 10);

        double messages_per_second = (burst_size * 1000000.0) / burst_time;
        double time_per_message = burst_time / burst_size;

        std::cout << "    Burst " << std::setw(3) << burst_size
                  << ": " << std::setw(6) << std::fixed << std::setprecision(2) << time_per_message << " μs/msg"
                  << " (" << std::setw(8) << std::setprecision(1) << messages_per_second << " msg/s)" << std::endl;
    }
}

// ===============================================
// Concurrent Performance Tests
// ===============================================

TEST_F(TransportPerformanceTest, Concurrency_MultipleSenders) {
    std::cout << "\n  📊 Concurrent Senders Performance:" << std::endl;

    const int num_senders = 8;
    const int messages_per_sender = 100;
    const size_t message_size = 512;

    std::vector<std::unique_ptr<Transport>> transports;
    std::vector<std::future<void>> futures;
    std::atomic<int> total_sent{0};

    // Create transports
    for (int i = 0; i < num_senders; ++i) {
        auto config = config_;
        config.port = 8200 + i;
        auto transport = TransportFactory::create_websocket(config);
        ASSERT_TRUE(transport->connect().is_success());
        transports.push_back(std::move(transport));
    }

    const auto& test_message = test_messages_[message_size];

    auto concurrent_time = TestHelpers::benchmark_function([&]() {
        // Start all senders
        for (int i = 0; i < num_senders; ++i) {
            futures.push_back(std::async(std::launch::async, [&, i]() {
                for (int j = 0; j < messages_per_sender; ++j) {
                    if (transports[i]->send(test_message).is_success()) {
                        total_sent.fetch_add(1);
                    }
                }
            }));
        }

        // Wait for all to complete
        for (auto& future : futures) {
            future.wait();
        }
    }, 1);

    int expected_total = num_senders * messages_per_sender;
    double messages_per_second = (expected_total * 1000000.0) / concurrent_time;
    size_t total_bytes = expected_total * message_size;
    double throughput_mbps = (total_bytes * 1000000.0) / (concurrent_time * 1024.0 * 1024.0);

    PrintResults("Concurrent Sending", concurrent_time);

    std::cout << "    " << num_senders << " senders × " << messages_per_sender << " messages = "
              << total_sent.load() << "/" << expected_total << " sent" << std::endl;
    std::cout << "    Rate: " << std::fixed << std::setprecision(1) << messages_per_second
              << " msg/s (" << std::setprecision(2) << throughput_mbps << " MB/s)" << std::endl;

    EXPECT_EQ(total_sent.load(), expected_total);
}

TEST_F(TransportPerformanceTest, Concurrency_SendReceiveSimulation) {
    std::cout << "\n  📊 Send/Receive Simulation Performance:" << std::endl;

    MockTransport mock_transport(config_);
    ASSERT_TRUE(mock_transport.connect().is_success());

    const int num_messages = 500;
    const size_t message_size = 1024;
    const auto& test_message = test_messages_[message_size];

    std::atomic<int> messages_received{0};
    mock_transport.set_message_callback([&](const ByteBuffer& data) {
        messages_received.fetch_add(1);
        // Simulate processing time
        TestHelpers::sleep_ms(1);
    });

    auto simulation_time = TestHelpers::benchmark_function([&]() {
        // Start sender thread
        auto sender_future = std::async(std::launch::async, [&]() {
            for (int i = 0; i < num_messages; ++i) {
                mock_transport.send(test_message);
                TestHelpers::sleep_ms(2); // Simulate send interval
            }
        });

        // Start receiver simulation thread
        auto receiver_future = std::async(std::launch::async, [&]() {
            for (int i = 0; i < num_messages; ++i) {
                mock_transport.simulate_receive_message(test_message);
                TestHelpers::sleep_ms(3); // Simulate receive interval
            }
        });

        sender_future.wait();
        receiver_future.wait();
    }, 1);

    // Wait for final message processing
    TestHelpers::sleep_ms(100);

    PrintResults("Send/Receive Simulation", simulation_time);

    auto stats = mock_transport.get_stats();
    std::cout << "    Sent: " << stats.messages_sent << " messages ("
              << TestHelpers::format_bytes(stats.bytes_sent) << ")" << std::endl;
    std::cout << "    Received: " << messages_received.load() << "/" << num_messages
              << " messages processed" << std::endl;

    EXPECT_EQ(stats.messages_sent, num_messages);
    EXPECT_EQ(messages_received.load(), num_messages);
}

// ===============================================
// Memory and Resource Tests
// ===============================================

TEST_F(TransportPerformanceTest, Resource_StatisticsOverhead) {
    std::cout << "\n  📊 Statistics Tracking Overhead:" << std::endl;

    auto transport = TransportFactory::create_websocket(config_);
    ASSERT_TRUE(transport->connect().is_success());

    const int num_operations = 10000;
    const auto& test_message = test_messages_[256];

    // Measure time with statistics
    auto time_with_stats = TestHelpers::benchmark_function([&]() {
        for (int i = 0; i < num_operations; ++i) {
            transport->send(test_message);
            if (i % 100 == 0) {
                transport->get_stats(); // Periodic stats access
            }
        }
    }, 1);

    // Reset and measure baseline (though our implementation always tracks stats)
    transport->reset_stats();
    auto time_baseline = TestHelpers::benchmark_function([&]() {
        for (int i = 0; i < num_operations; ++i) {
            transport->send(test_message);
        }
    }, 1);

    double overhead_percent = ((time_with_stats - time_baseline) / time_baseline) * 100.0;

    PrintResults("With Stats Access", time_with_stats);
    PrintResults("Baseline", time_baseline);

    std::cout << "    Statistics overhead: " << std::fixed << std::setprecision(2)
              << overhead_percent << "%" << std::endl;

    // Overhead should be minimal
    EXPECT_LT(std::abs(overhead_percent), 10.0); // Less than 10% overhead
}

TEST_F(TransportPerformanceTest, Resource_LargeMessageHandling) {
    std::cout << "\n  📊 Large Message Performance:" << std::endl;

    auto transport = TransportFactory::create_websocket(config_);
    ASSERT_TRUE(transport->connect().is_success());

    // Test with progressively larger messages
    std::vector<size_t> large_sizes = {65536, 262144, 1048576}; // 64KB, 256KB, 1MB

    for (size_t size : large_sizes) {
        auto large_message = TestHelpers::generate_random_data(size);

        auto send_time = TestHelpers::benchmark_function([&]() {
            transport->send(large_message);
        }, 10);

        double throughput_mbps = (size * 1000000.0) / (send_time * 1024.0 * 1024.0);

        std::cout << "    " << std::setw(8) << TestHelpers::format_bytes(size)
                  << ": " << std::setw(10) << TestHelpers::format_duration(send_time)
                  << " (" << std::fixed << std::setprecision(2) << throughput_mbps << " MB/s)" << std::endl;

        // Large messages should still process in reasonable time
        EXPECT_LT(send_time, 100000.0); // 100ms for mock transport
    }
}

// ===============================================
// Transport Comparison Tests
// ===============================================

TEST_F(TransportPerformanceTest, Comparison_TransportTypes) {
    std::cout << "\n  📊 Transport Type Comparison:" << std::endl;

    const size_t test_size = 1024;
    const auto& test_message = test_messages_[test_size];
    const int num_operations = 100;

    // WebSocket transport
    auto ws_transport = TransportFactory::create_websocket(config_);
    ASSERT_TRUE(ws_transport->connect().is_success());

    auto ws_time = TestHelpers::benchmark_function([&]() {
        for (int i = 0; i < num_operations; ++i) {
            ws_transport->send(test_message);
        }
    }, 1);

    // HTTP/2 transport (will show NOT_IMPLEMENTED performance)
    auto http2_config = config_;
    http2_config.type = TransportType::HTTP2;
    auto http2_transport = TransportFactory::create_http2(http2_config);

    auto http2_time = TestHelpers::benchmark_function([&]() {
        for (int i = 0; i < num_operations; ++i) {
            http2_transport->send(test_message); // Will fail quickly
        }
    }, 1);

    double ws_rate = (num_operations * 1000000.0) / ws_time;
    double http2_rate = (num_operations * 1000000.0) / http2_time;

    std::cout << "    WebSocket: " << TestHelpers::format_duration(ws_time / num_operations)
              << " per operation (" << std::fixed << std::setprecision(1) << ws_rate << " ops/s)" << std::endl;
    std::cout << "    HTTP/2:    " << TestHelpers::format_duration(http2_time / num_operations)
              << " per operation (" << std::fixed << std::setprecision(1) << http2_rate << " ops/s)" << std::endl;

    // WebSocket should be much faster since HTTP/2 is not implemented
    EXPECT_GT(ws_rate, http2_rate * 10); // At least 10x faster
}

// ===============================================
// Performance Summary
// ===============================================

TEST_F(TransportPerformanceTest, Summary_OverallPerformance) {
    std::cout << "\n  📊 Transport Performance Summary:" << std::endl;

    auto transport = TransportFactory::create_websocket(config_);
    ASSERT_TRUE(transport->connect().is_success());

    // Quick benchmark of key operations
    const auto& small_msg = test_messages_[256];
    const auto& large_msg = test_messages_[16384];

    // Small message throughput
    auto small_time = TestHelpers::benchmark_function([&]() {
        for (int i = 0; i < 1000; ++i) {
            transport->send(small_msg);
        }
    }, 1);

    // Large message throughput
    auto large_time = TestHelpers::benchmark_function([&]() {
        for (int i = 0; i < 100; ++i) {
            transport->send(large_msg);
        }
    }, 1);

    // Connection establishment
    auto connect_time = TestHelpers::benchmark_function([&]() {
        auto temp_transport = TransportFactory::create_websocket(config_);
        temp_transport->connect();
        temp_transport->disconnect();
    }, 10);

    double small_rate = (1000 * 1000000.0) / small_time;
    double large_throughput = (100 * large_msg.size() * 1000000.0) / (large_time * 1024.0 * 1024.0);
    double connect_rate = (1000000.0) / connect_time;

    std::cout << "    Small messages (256B): " << std::fixed << std::setprecision(0) << small_rate << " msg/s" << std::endl;
    std::cout << "    Large messages (16KB): " << std::setprecision(2) << large_throughput << " MB/s" << std::endl;
    std::cout << "    Connection rate:        " << std::setprecision(1) << connect_rate << " conn/s" << std::endl;

    auto final_stats = transport->get_stats();
    std::cout << "    Total operations:       " << final_stats.messages_sent << " messages, "
              << TestHelpers::format_bytes(final_stats.bytes_sent) << std::endl;
}
