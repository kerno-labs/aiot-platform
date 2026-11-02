package event

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDeviceMessageDecodePayload(t *testing.T) {
	for _, raw := range []string{`{"version":"1.2.3"}`, `"{\"version\":\"1.2.3\"}"`} {
		t.Run(raw, func(t *testing.T) {
			msg := DeviceMessage{Payload: json.RawMessage(raw)}
			var payload OTAInformPayload
			require.NoError(t, msg.DecodePayload(&payload))
			require.Equal(t, "1.2.3", payload.Version)
			require.Equal(t, raw, string(msg.Payload))
		})
	}
	for _, raw := range []string{`"not json"`, `"{broken`, `{broken`} {
		t.Run("invalid_"+raw, func(t *testing.T) {
			var payload OTAInformPayload
			require.Error(t, (DeviceMessage{Payload: json.RawMessage(raw)}).DecodePayload(&payload))
		})
	}
}
