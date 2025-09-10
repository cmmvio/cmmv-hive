/**
 * UMICP Envelope Node.js Wrapper Implementation
 */

#include "envelope_wrap.h"
#include <napi.h>

using namespace umicp;

Napi::Object EnvelopeWrap::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "Envelope", {
        InstanceMethod("setFrom", &EnvelopeWrap::SetFrom),
        InstanceMethod("setTo", &EnvelopeWrap::SetTo),
        InstanceMethod("setOperation", &EnvelopeWrap::SetOperation),
        InstanceMethod("setMessageId", &EnvelopeWrap::SetMessageId),
        InstanceMethod("setCapabilities", &EnvelopeWrap::SetCapabilities),
        InstanceMethod("setPayloadHint", &EnvelopeWrap::SetPayloadHint),
        InstanceMethod("serialize", &EnvelopeWrap::Serialize),
        InstanceMethod("deserialize", &EnvelopeWrap::Deserialize),
        InstanceMethod("validate", &EnvelopeWrap::Validate),
        InstanceMethod("getHash", &EnvelopeWrap::GetHash),

        StaticMethod("create", &EnvelopeWrap::CreateEnvelope),
        StaticMethod("serialize", &EnvelopeWrap::SerializeEnvelope),
        StaticMethod("deserialize", &EnvelopeWrap::DeserializeEnvelope),
        StaticMethod("validate", &EnvelopeWrap::ValidateEnvelope),
        StaticMethod("hash", &EnvelopeWrap::HashEnvelope)
    });

    exports.Set("Envelope", func);
    return exports;
}

EnvelopeWrap::EnvelopeWrap(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<EnvelopeWrap>(info) {
    // Initialize with default values
    envelope_.version = "1.0";
    envelope_.msg_id = ""; // Will be set later
    envelope_.ts = "";     // Will be set later
    envelope_.from = "";
    envelope_.to = "";
    envelope_.op = OperationType::CONTROL;
}

Napi::Value EnvelopeWrap::SetFrom(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    envelope_.from = info[0].As<Napi::String>().Utf8Value();
    return info.This();
}

Napi::Value EnvelopeWrap::SetTo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    envelope_.to = info[0].As<Napi::String>().Utf8Value();
    return info.This();
}

Napi::Value EnvelopeWrap::SetOperation(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    int32_t op_value = info[0].As<Napi::Number>().Int32Value();
    envelope_.op = static_cast<OperationType>(op_value);
    return info.This();
}

Napi::Value EnvelopeWrap::SetMessageId(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    envelope_.msg_id = info[0].As<Napi::String>().Utf8Value();
    return info.This();
}

Napi::Value EnvelopeWrap::SetCapabilities(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Object expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object caps_obj = info[0].As<Napi::Object>();
    envelope_.capabilities = StringMap();

    Napi::Array property_names = caps_obj.GetPropertyNames();
    for (uint32_t i = 0; i < property_names.Length(); ++i) {
        Napi::Value key = property_names.Get(i);
        Napi::Value value = caps_obj.Get(key);
        (*envelope_.capabilities)[key.As<Napi::String>().Utf8Value()] =
            value.As<Napi::String>().Utf8Value();
    }

    return info.This();
}

Napi::Value EnvelopeWrap::SetPayloadHint(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Object expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object hint_obj = info[0].As<Napi::Object>();
    PayloadHint hint;

    if (hint_obj.Has("type")) {
        hint.type = static_cast<PayloadType>(hint_obj.Get("type").As<Napi::Number>().Int32Value());
    }

    if (hint_obj.Has("size")) {
        hint.size = hint_obj.Get("size").As<Napi::Number>().Int64Value();
    }

    if (hint_obj.Has("encoding")) {
        hint.encoding = static_cast<EncodingType>(hint_obj.Get("encoding").As<Napi::Number>().Int32Value());
    }

    if (hint_obj.Has("count")) {
        hint.count = hint_obj.Get("count").As<Napi::Number>().Int64Value();
    }

    envelope_.payload_hint = hint;
    return info.This();
}

Napi::Value EnvelopeWrap::Serialize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    auto result = EnvelopeProcessor::serialize(envelope_);

    if (!result.is_success()) {
        Napi::Error::New(env, result.error_message.value_or("Serialization failed")).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::String::New(env, *result.value);
}

Napi::Value EnvelopeWrap::Deserialize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string json_str = info[0].As<Napi::String>().Utf8Value();
    auto result = EnvelopeProcessor::deserialize(json_str);

    if (!result.is_success()) {
        Napi::Error::New(env, result.error_message.value_or("Deserialization failed")).ThrowAsJavaScriptException();
        return env.Null();
    }

    envelope_ = *result.value;
    return info.This();
}

Napi::Value EnvelopeWrap::Validate(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    auto result = EnvelopeProcessor::validate(envelope_);

    if (!result.is_success()) {
        Napi::Error::New(env, result.error_message.value_or("Validation failed")).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Boolean::New(env, true);
}

Napi::Value EnvelopeWrap::GetHash(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    std::string hash = EnvelopeProcessor::hash(envelope_);
    return Napi::String::New(env, hash);
}

// Static methods
Napi::Value EnvelopeWrap::CreateEnvelope(const Napi::CallbackInfo& info) {
    return info.Env().Undefined();
}

Napi::Value EnvelopeWrap::SerializeEnvelope(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Envelope object expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    // This would need to extract the envelope from the JavaScript object
    // For now, return null
    return env.Null();
}

Napi::Value EnvelopeWrap::DeserializeEnvelope(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    // This would create a new EnvelopeWrap instance
    // For now, return null
    return env.Null();
}

Napi::Value EnvelopeWrap::ValidateEnvelope(const Napi::CallbackInfo& info) {
    return info.Env().Undefined();
}

Napi::Value EnvelopeWrap::HashEnvelope(const Napi::CallbackInfo& info) {
    return info.Env().Undefined();
}
