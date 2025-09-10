# UMICP Tests - CMake Configuration
# Comprehensive test suite for all UMICP components

cmake_minimum_required(VERSION 3.16)

# Find testing framework
find_package(GTest QUIET)
if(NOT GTest_FOUND)
    # Try to find system GoogleTest
    find_package(PkgConfig)
    if(PkgConfig_FOUND)
        pkg_check_modules(GTEST gtest)
        pkg_check_modules(GTEST_MAIN gtest_main)
    endif()

    # If still not found, try direct linking
    if(NOT GTEST_FOUND)
        find_library(GTEST_LIBRARY gtest)
        find_library(GTEST_MAIN_LIBRARY gtest_main)
        if(GTEST_LIBRARY AND GTEST_MAIN_LIBRARY)
            set(GTEST_LIBRARIES ${GTEST_LIBRARY})
            set(GTEST_MAIN_LIBRARIES ${GTEST_MAIN_LIBRARY})
            set(GTEST_FOUND TRUE)
        endif()
    endif()

    # Last resort: download and build GoogleTest
    if(NOT GTEST_FOUND)
        include(FetchContent)
        FetchContent_Declare(
            googletest
            URL https://github.com/google/googletest/archive/03597a01ee50331fc36141fd20fd08fa9b13fb1e.zip
        )
        set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
        FetchContent_MakeAvailable(googletest)
        set(GTEST_LIBRARIES gtest)
        set(GTEST_MAIN_LIBRARIES gtest_main)
    endif()
else()
    set(GTEST_LIBRARIES GTest::gtest)
    set(GTEST_MAIN_LIBRARIES GTest::gtest_main)
endif()

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/../include
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Test sources
set(TEST_SOURCES
    test_main.cpp
    unit/test_matrix_ops.cpp
    unit/test_serialization.cpp
    unit/test_security.cpp
    unit/test_transport.cpp
    unit/test_protocol.cpp
    integration/test_s2s_transport.cpp
    integration/test_protocol_integration.cpp
    performance/test_matrix_performance.cpp
    performance/test_transport_performance.cpp
    utils/test_helpers.cpp
)

# Create test executable
add_executable(umicp_tests ${TEST_SOURCES})

# Link libraries
target_link_libraries(umicp_tests
    umicp_static
    ${GTEST_LIBRARIES}
    ${GTEST_MAIN_LIBRARIES}
    ${JSON_LIBRARIES}
    ${ZLIB_LIBRARIES}
    ${OPENSSL_LIBRARIES}
    ${CBOR_LIBRARIES}
    pthread
)

# Compiler flags for tests
target_compile_options(umicp_tests PRIVATE
    -Wall -Wextra -Wpedantic
    -DUMICP_TESTING
)

# Register tests with CTest
include(GoogleTest)
gtest_discover_tests(umicp_tests)

# Individual test targets for development
add_executable(matrix_tests unit/test_matrix_ops.cpp utils/test_helpers.cpp test_main.cpp)
target_link_libraries(matrix_tests umicp_static ${GTEST_LIBRARIES} ${GTEST_MAIN_LIBRARIES} pthread)

add_executable(transport_tests unit/test_transport.cpp integration/test_s2s_transport.cpp utils/test_helpers.cpp test_main.cpp)
target_link_libraries(transport_tests umicp_static ${GTEST_LIBRARIES} ${GTEST_MAIN_LIBRARIES} pthread)

add_executable(protocol_tests unit/test_protocol.cpp utils/test_helpers.cpp test_main.cpp)
target_link_libraries(protocol_tests umicp_static ${GTEST_LIBRARIES} ${GTEST_MAIN_LIBRARIES} pthread)

# Performance tests (separate executable)
add_executable(performance_tests
    performance/test_matrix_performance.cpp
    performance/test_transport_performance.cpp
    utils/test_helpers.cpp
    test_main.cpp
)
target_link_libraries(performance_tests umicp_static ${GTEST_LIBRARIES} ${GTEST_MAIN_LIBRARIES} pthread)

# Test data directory (create if needed)
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/data)
    file(COPY ${CMAKE_CURRENT_SOURCE_DIR}/data DESTINATION ${CMAKE_CURRENT_BINARY_DIR})
endif()

# Custom test targets
add_custom_target(test_unit
    COMMAND matrix_tests
    COMMAND transport_tests
    COMMAND protocol_tests
    DEPENDS matrix_tests transport_tests protocol_tests
    COMMENT "Running unit tests"
)

add_custom_target(test_performance
    COMMAND performance_tests
    DEPENDS performance_tests
    COMMENT "Running performance benchmarks"
)

add_custom_target(test_all
    COMMAND umicp_tests
    DEPENDS umicp_tests
    COMMENT "Running complete test suite"
)
