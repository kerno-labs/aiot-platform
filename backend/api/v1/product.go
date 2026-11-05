// Package v1 owns the version 1 HTTP contracts. This file mirrors
// device-service/api/product/v1/product.proto.
package v1

type CreateProductRequest struct {
	Name               string                 `json:"name" binding:"required"`
	Description        string                 `json:"description"`
	CategoryID         *int64                 `json:"categoryId" binding:"required"`
	Status             string                 `json:"status"`
	NodeType           string                 `json:"nodeType"`
	ConnectivityMethod string                 `json:"connectivityMethod"`
	AccessProtocol     string                 `json:"accessProtocol"`
	Protocols          []ProductProtocolInput `json:"protocols"`
} //@name ProductCreateProductRequest
type UpdateProductRequest struct {
	Name               string                 `json:"name"`
	Description        string                 `json:"description"`
	CategoryID         *int64                 `json:"categoryId"`
	Status             string                 `json:"status"`
	NodeType           string                 `json:"nodeType"`
	ConnectivityMethod string                 `json:"connectivityMethod"`
	AccessProtocol     string                 `json:"accessProtocol"`
	Protocols          []ProductProtocolInput `json:"protocols"`
} //@name ProductUpdateProductRequest

type ListProductsRequest struct {
	PageRequest
	Category   string `form:"category"`
	Status     string `form:"status"`
	SearchText string `form:"searchText"`
} //@name ProductListProductsRequest
type ProductProtocolInput struct {
	TransportProtocol   string `json:"transportProtocol" binding:"required"`
	ApplicationProtocol string `json:"applicationProtocol" binding:"required"`
}
type Product struct {
	ID                 int64                  `json:"id"`
	ProductKey         string                 `json:"productKey"`
	Name               string                 `json:"name"`
	Description        string                 `json:"description"`
	CategoryID         *int64                 `json:"categoryId"`
	Status             string                 `json:"status"`
	DeviceCount        int32                  `json:"deviceCount"`
	NodeType           string                 `json:"nodeType"`
	ConnectivityMethod string                 `json:"connectivityMethod"`
	AccessProtocol     string                 `json:"accessProtocol"`
	Protocols          []ProductProtocolInput `json:"protocols,omitempty"`
	OrganizationID     string                 `json:"organizationId"`
	CreatedAt          string                 `json:"createdAt"`
	UpdatedAt          string                 `json:"updatedAt"`
	DeletedAt          *string                `json:"deletedAt,omitempty"`
} //@name Product
type ProductListItem struct {
	Product
	CategoryName string `json:"categoryName"`
} //@name ProductListItem
type CreateProductResponse struct {
	Product Product `json:"product"`
} //@name ProductCreateProductResponse
type GetProductResponse struct {
	Product Product `json:"product"`
} //@name ProductGetProductResponse
type GetProductByKeyResponse struct {
	Product Product `json:"product"`
} //@name ProductGetProductByKeyResponse
type UpdateProductResponse struct {
	Product Product `json:"product"`
} //@name ProductUpdateProductResponse
type ListProductsResponse struct {
	Products []ProductListItem `json:"products"`
	Total    int64             `json:"total"`
	Page     int               `json:"page"`
	PageSize int               `json:"pageSize"`
} //@name ProductListProductsResponse

type ProductSuccessResponse struct {
	Success bool `json:"success"`
} //@name ProductSuccessResponse

type ProductOption struct {
	ID         int64  `json:"id"`
	ProductKey string `json:"productKey"`
	Name       string `json:"name"`
	NodeType   string `json:"nodeType"`
} //@name ProductOption
