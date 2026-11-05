package v1

type ThingModelProperty struct {
	Identifier string  `json:"identifier"`
	Name       string  `json:"name"`
	DataType   string  `json:"dataType"`
	Unit       string  `json:"unit"`
	AccessMode string  `json:"accessMode"`
	Value      any     `json:"value" swaggertype:"object"`
	ReportedAt *string `json:"reportedAt"`
} //@name ThingModelProperty

type GetDeviceThingModelPropertiesResponse struct {
	Items []ThingModelProperty `json:"items"`
} //@name GetDeviceThingModelPropertiesResponse
