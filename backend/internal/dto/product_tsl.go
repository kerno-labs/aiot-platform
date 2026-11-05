package dto

// ProductTSLDocument represents the parsed JSON schema of a Product TSL.
type ProductTSLDocument struct {
	Items    []ProductTSLProperty `json:"properties"`
	Services []ProductTSLService  `json:"services"`
}

// ProductTSLProperty represents a single property defined within a Product TSL.
type ProductTSLProperty struct {
	Identifier string `json:"identifier"`
	Name       string `json:"name"`
	AccessMode string `json:"accessMode"`
	DataType   struct {
		Type  string `json:"type"`
		Specs struct {
			Unit string `json:"unit"`
		} `json:"specs"`
	} `json:"dataType"`
}

// ProductTSLService represents a single service defined within a Product TSL.
type ProductTSLService struct {
	Identifier string `json:"identifier"`
	Name       string `json:"name"`
	CallType   string `json:"callType"`
}
