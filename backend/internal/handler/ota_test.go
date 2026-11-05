package handler

import (
	"testing"
	"time"

	"aiot-backend/internal/dto"
	"aiot-backend/internal/model"

	"github.com/dromara/carbon/v2"
	"github.com/stretchr/testify/require"
)

func TestOTAResponseMapping(t *testing.T) {
	now := time.Date(2026, time.August, 25, 8, 58, 57, 0, time.UTC)
	pkg := otaPackageJSON(model.OTAPackage{ID: 3, PackageName: "firmware-1", ProductKey: "P001", ProductName: "传感器", CreatedAt: now, UpdatedAt: now})
	require.EqualValues(t, 3, pkg.ID)
	require.Equal(t, "firmware-1", pkg.PackageName)
	require.Equal(t, "P001", pkg.ProductKey)
	require.Equal(t, "传感器", pkg.ProductName)

	deployment := otaDeploymentJSON(dto.DeviceDeployment{
		DeviceID: 4, DeviceKey: "D001", DeviceName: "sensor", ProductID: 2,
		ProductKey: "P001", CurrentVersion: "1.0.0", UpgradeBatchID: "B001", Status: "success",
		LastStatusChangeTime: 100, CreatedAt: now,
	})
	require.EqualValues(t, 4, deployment.DeviceID)
	require.Equal(t, "P001", deployment.ProductKey)
	require.Equal(t, "2026-08-25 08:58:57", deployment.CreatedAt)
	require.Equal(t, carbon.CreateFromTimestamp(100).ToDateTimeString(), deployment.LastStatusChangeTime)
}
