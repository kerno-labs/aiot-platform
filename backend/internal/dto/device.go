package dto

// ListDevicesQuery defines query parameters for filtering and paginating devices.
type ListDevicesQuery struct {
	Page      int
	PageSize  int
	ProductID int64
	States    []int
	Enabled   *bool
	Search    string
}
