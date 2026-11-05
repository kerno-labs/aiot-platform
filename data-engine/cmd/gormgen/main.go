//go:generate go run .

package main

import (
	"path/filepath"
	"runtime"

	"data-engine/internal/model"

	"gorm.io/gen"
)

func main() {
	_, file, _, _ := runtime.Caller(0)
	g := gen.NewGenerator(gen.Config{
		OutPath: filepath.Join(filepath.Dir(file), "../../internal/dal/query"),
	})

	g.ApplyBasic(
		model.Device{},
		model.DeviceState{},
		model.DeviceServiceInvocation{},
		model.OTAUpgradeBatch{},
		model.OTADeviceUpgradeStatus{},
		model.DeviceEvent{},
	)

	g.Execute()
}
