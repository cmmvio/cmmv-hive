{
  "targets": [
    {
      "target_name": "umicp_core",
      "sources": [
        "src/umicp_core.cc",
        "src/envelope_wrap.cc",
        "src/frame_wrap.cc",
        "src/matrix_wrap.cc"
      ],
      "include_dirs": [
        "<!(node -e \"require('node-addon-api').include\")",
        "../../../cpp/include"
      ],
      "dependencies": [
        "<!(node -e \"require('node-addon-api').gyp\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "NODE_ADDON_API_DISABLE_DEPRECATED"
      ],
      "cflags": [
        "-std=c++17",
        "-O3",
        "-march=native",
        "-flto"
      ],
      "cflags_cc": [
        "-std=c++17",
        "-O3",
        "-march=native",
        "-flto"
      ],
      "conditions": [
        ["OS=='mac'", {
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "NO",
            "GCC_ENABLE_CPP_RTTI": "NO",
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.15",
            "OTHER_CFLAGS": [
              "-O3",
              "-march=native",
              "-flto"
            ]
          }
        }],
        ["OS=='linux'", {
          "libraries": [
            "-ljson-c",
            "-lz",
            "-lssl",
            "-lcrypto"
          ]
        }],
        ["OS=='win'", {
          "libraries": [
            "json-c.lib",
            "zlib.lib",
            "libssl.lib",
            "libcrypto.lib"
          ]
        }]
      ]
    }
  ]
}
