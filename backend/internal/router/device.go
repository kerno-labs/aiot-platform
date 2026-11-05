package router

import "github.com/gin-gonic/gin"

func InitDeviceRouter(deps RouterDeps, r *gin.RouterGroup) {
	device := deps.DeviceHandler
	thingModelData := deps.ThingModelDataHandler
	protocol := deps.ProtocolHandler
	r.POST("/devices", device.CreateDevice)
	r.GET("/devices", device.ListDevices)
	r.GET("/devices/:deviceKey", device.GetDevice)
	r.PUT("/devices/:deviceKey", device.UpdateDevice)
	r.DELETE("/devices/:deviceKey", device.DeleteDevice)
	r.POST("/devices/:deviceKey/activate", device.Activate)
	r.POST("/devices/:deviceKey/enabled", device.Enabled)
	r.GET("/device-statistics", device.Stats)
	r.GET("/devices/:deviceKey/telemetry", device.Telemetry)
	// 连接信息按产品协议实时生成，不对设备端点做单独配置。
	r.GET("/devices/:deviceKey/endpoints", protocol.ListDeviceEndpoints)
	r.GET("/devices/:deviceKey/tags", device.GetTags)
	r.PUT("/devices/:deviceKey/tags", device.PutTags)
	r.POST("/devices/:deviceKey/tags", device.PostTags)
	r.DELETE("/devices/:deviceKey/tags", device.DeleteTags)
	r.GET("/devices/:deviceKey/shadow", device.GetShadow)
	r.PUT("/devices/:deviceKey/shadow/desired", device.Desired)
	r.DELETE("/devices/:deviceKey/shadow/desired", device.ClearDesired)
	r.GET("/devices/:deviceKey/shadow/history", device.History)
	r.POST("/devices/:deviceKey/simulate-push", device.SimulatePush)
	r.GET("/devices/:deviceKey/push-records", device.PushRecords)
	r.GET("/devices/:deviceKey/thing-model/service-invocations", thingModelData.ListServiceInvocations)
	r.POST("/devices/:deviceKey/thing-model/services/:serviceIdentifier/invoke", thingModelData.InvokeService)
	r.GET("/devices/:deviceKey/thing-model/properties", thingModelData.ListProperties)
	r.GET("/devices/push-records/:pushRecordId", device.PushRecord)
	r.DELETE("/devices/:deviceKey/push-records", device.ClearPushRecords)
	r.POST("/devices/batch/upload", device.BatchUpload)
	r.GET("/devices/batch/template", device.BatchTemplate)
}
