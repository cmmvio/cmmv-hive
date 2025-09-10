# UMICP C++ Core Implementation - CMake Configuration
# Based on BIP-05 Universal Matrix Intelligent Communication Protocol

cmake_minimum_required(VERSION 3.16)
project(UMICP VERSION 1.0.0 LANGUAGES CXX C)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Build type configuration
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Compiler flags
if(MSVC)
    add_compile_options(/W4 /permissive-)
else()
    add_compile_options(-Wall -Wextra -Wpedantic -Werror)
endif()

# LLVM/Clang optimization flags
if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
    add_compile_options(-flto -fvectorize -fslp-vectorize)
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
    add_compile_options(-flto -ftree-vectorize)
endif()

# Dependencies
find_package(PkgConfig REQUIRED)

# Required packages
pkg_check_modules(JSON REQUIRED json-c)
pkg_check_modules(ZLIB REQUIRED zlib)
pkg_check_modules(OPENSSL REQUIRED openssl)

# Optional packages
pkg_check_modules(CBOR cbor)
pkg_check_modules(MSGPACK msgpack-c)

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${JSON_INCLUDE_DIRS}
    ${ZLIB_INCLUDE_DIRS}
    ${OPENSSL_INCLUDE_DIRS}
)

# Link directories
link_directories(
    ${JSON_LIBRARY_DIRS}
    ${ZLIB_LIBRARY_DIRS}
    ${OPENSSL_LIBRARY_DIRS}
)

# Source files
set(UMICP_SOURCES
    src/envelope.cpp
    src/frame.cpp
    src/protocol.cpp
    src/security.cpp
    src/transport.cpp
    src/buffer.cpp
    src/config.cpp
    src/matrix_ops.cpp
    src/serialization.cpp
    src/compression.cpp
    src/crypto.cpp
    src/c_api.cpp
)

# Header files
set(UMICP_HEADERS
    include/umicp.h
    include/umicp_types.h
    include/envelope.h
    include/frame.h
    include/protocol.h
    include/security.h
    include/transport.h
    include/buffer.h
    include/config.h
    include/matrix_ops.h
    include/serialization.h
    include/compression.h
    include/crypto.h
)

# Create static library
add_library(umicp_static STATIC ${UMICP_SOURCES} ${UMICP_HEADERS})
target_link_libraries(umicp_static
    ${JSON_LIBRARIES}
    ${ZLIB_LIBRARIES}
    ${OPENSSL_LIBRARIES}
)

# Create shared library
add_library(umicp_shared SHARED ${UMICP_SOURCES} ${UMICP_HEADERS})
target_link_libraries(umicp_shared
    ${JSON_LIBRARIES}
    ${ZLIB_LIBRARIES}
    ${OPENSSL_LIBRARIES}
)

# Set library properties
set_target_properties(umicp_static PROPERTIES
    OUTPUT_NAME umicp
    VERSION ${PROJECT_VERSION}
    SOVERSION ${PROJECT_VERSION_MAJOR}
)

set_target_properties(umicp_shared PROPERTIES
    OUTPUT_NAME umicp
    VERSION ${PROJECT_VERSION}
    SOVERSION ${PROJECT_VERSION_MAJOR}
)

# Build examples
option(BUILD_EXAMPLES "Build example programs" ON)
if(BUILD_EXAMPLES)
    add_subdirectory(examples)
endif()

# Build tests
option(BUILD_TESTS "Build test programs" ON)
if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

# Installation
install(TARGETS umicp_static umicp_shared
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)

install(FILES ${UMICP_HEADERS} DESTINATION include/umicp)

# Generate pkg-config file
configure_file(
    ${CMAKE_CURRENT_SOURCE_DIR}/umicp.pc.in
    ${CMAKE_CURRENT_BINARY_DIR}/umicp.pc
    @ONLY
)

install(FILES ${CMAKE_CURRENT_BINARY_DIR}/umicp.pc
    DESTINATION lib/pkgconfig
)

# Create alias targets
add_library(UMICP::static ALIAS umicp_static)
add_library(UMICP::shared ALIAS umicp_shared)

# Export targets
export(TARGETS umicp_static umicp_shared
    FILE UMICPTargets.cmake
    NAMESPACE UMICP::
)

# Generate and install CMake package config
include(CMakePackageConfigHelpers)
write_basic_package_version_file(
    UMICPConfigVersion.cmake
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY SameMajorVersion
)

configure_package_config_file(
    UMICPConfig.cmake.in
    UMICPConfig.cmake
    INSTALL_DESTINATION lib/cmake/UMICP
)

install(FILES
    ${CMAKE_CURRENT_BINARY_DIR}/UMICPConfig.cmake
    ${CMAKE_CURRENT_BINARY_DIR}/UMICPConfigVersion.cmake
    DESTINATION lib/cmake/UMICP
)
