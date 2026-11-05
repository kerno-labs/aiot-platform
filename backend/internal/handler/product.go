package handler

import (
	"net/http"

	v1 "aiot-backend/api/v1"
	"aiot-backend/internal/model"
	"aiot-backend/internal/service"

	"github.com/gin-gonic/gin"
)

func productJSON(product model.Product, count int64) v1.Product {
	return v1.Product{
		ID:                 product.ID,
		ProductKey:         product.ProductKey,
		Name:               product.Name,
		Description:        product.Description,
		CategoryID:         product.CategoryID,
		Status:             product.Status,
		DeviceCount:        int32(count),
		NodeType:           product.NodeType,
		ConnectivityMethod: product.ConnectivityMethod,
		AccessProtocol:     product.AccessProtocol,
		Protocols: func() []v1.ProductProtocolInput {
			items := make([]v1.ProductProtocolInput, len(product.Protocols))
			for i, protocol := range product.Protocols {
				items[i] = v1.ProductProtocolInput{TransportProtocol: protocol.TransportProtocol, ApplicationProtocol: protocol.ApplicationProtocol}
			}
			return items
		}(),
		OrganizationID: product.OrganizationID,
		CreatedAt:      formatStdTime(product.CreatedAt),
		UpdatedAt:      formatStdTime(product.UpdatedAt),
		DeletedAt:      deletedAt(product.DeletedAt),
	}
}

type ProductHandler struct {
	*Handler
	svc service.ProductServiceInterface
}

func NewProductHandler(h *Handler, svc service.ProductServiceInterface) *ProductHandler {
	return &ProductHandler{Handler: h, svc: svc}
}

// Create godoc
// @Summary Create product
// @Schemes
// @Description Creates a product with its protocol configuration.
// @Tags Products
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.CreateProductRequest true "params"
// @Success 200 {object} v1.ApiResponse[v1.CreateProductResponse] "Successful response"
// @Router /products [post]
func (h *ProductHandler) Create(c *gin.Context) {
	var req v1.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	protocols := make([]model.ProductProtocol, len(req.Protocols))
	for i, item := range req.Protocols {
		protocols[i] = model.ProductProtocol{TransportProtocol: item.TransportProtocol, ApplicationProtocol: item.ApplicationProtocol}
	}
	if req.AccessProtocol == "default" {
		// The default option expands to the shared HTTP and MQTT JSON endpoints.
		protocols = []model.ProductProtocol{
			{TransportProtocol: "http", ApplicationProtocol: "json"},
			{TransportProtocol: "mqtt", ApplicationProtocol: "json"},
		}
	}
	product, err := h.svc.Create(c, &model.Product{Name: req.Name, Description: req.Description, CategoryID: req.CategoryID, Status: req.Status, NodeType: req.NodeType, ConnectivityMethod: req.ConnectivityMethod, AccessProtocol: req.AccessProtocol, Protocols: protocols})
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(c, v1.CreateProductResponse{Product: productJSON(*product, 0)})
}

// Get godoc
// @Summary Get product
// @Schemes
// @Description Gets a product by its product key.
// @Tags Products
// @Accept json
// @Produce json
// @Security Bearer
// @Param productKey path string true "Product key"
// @Success 200 {object} v1.ApiResponse[v1.GetProductResponse] "Successful response"
// @Router /products/{productKey} [get]
func (h *ProductHandler) Get(c *gin.Context) {
	product, err := h.svc.GetByKey(c, c.Param("productKey"))
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(c, v1.GetProductResponse{Product: productJSON(*product, 0)})
}

// List godoc
// @Summary List products
// @Schemes
// @Description Lists products with pagination and optional filters.
// @Tags Products
// @Accept json
// @Produce json
// @Security Bearer
// @Param request query v1.ListProductsRequest false "Query parameters"
// @Success 200 {object} v1.ApiResponse[v1.ListProductsResponse] "Successful response"
// @Router /products [get]
func (h *ProductHandler) List(c *gin.Context) {
	var req v1.ListProductsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	products, total, err := h.svc.List(c, req.Page, req.PageSize, req.Category, req.Status, req.SearchText)
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	items := make([]v1.ProductListItem, 0, len(products))
	for _, product := range products {
		item := v1.ProductListItem{Product: productJSON(product.Product, 0), CategoryName: product.CategoryName}
		items = append(items, item)
	}
	v1.HandleSuccess(c, v1.ListProductsResponse{Products: items, Total: total, Page: req.Page, PageSize: req.PageSize})
}

// Options godoc
// @Summary List product options
// @Schemes
// @Description Lists active products as options for select components.
// @Tags Products
// @Produce json
// @Security Bearer
// @Success 200 {object} v1.ApiResponse[[]v1.ProductOption] "Successful response"
// @Router /products/options [get]
func (h *ProductHandler) Options(c *gin.Context) {
	options, err := h.svc.ListOptions(c)
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	items := make([]v1.ProductOption, len(options))
	for i, opt := range options {
		items[i] = v1.ProductOption{
			ID:         opt.ID,
			ProductKey: opt.ProductKey,
			Name:       opt.Name,
			NodeType:   opt.NodeType,
		}
	}
	v1.HandleSuccess(c, items)
}

// Update godoc
// @Summary Update product
// @Schemes
// @Description Updates a product by its product key.
// @Tags Products
// @Accept json
// @Produce json
// @Security Bearer
// @Param productKey path string true "Product key"
// @Param request body v1.UpdateProductRequest true "params"
// @Success 200 {object} v1.ApiResponse[v1.UpdateProductResponse] "Successful response"
// @Router /products/{productKey} [put]
func (h *ProductHandler) Update(c *gin.Context) {
	product, err := h.svc.GetByKey(c, c.Param("productKey"))
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	var req v1.UpdateProductRequest
	if err = c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	if req.Name != "" {
		product.Name = req.Name
	}
	if req.Description != "" {
		product.Description = req.Description
	}
	if req.CategoryID != nil {
		product.CategoryID = req.CategoryID
	}
	if req.Status != "" {
		product.Status = req.Status
	}
	if req.NodeType != "" {
		product.NodeType = req.NodeType
	}
	if req.ConnectivityMethod != "" {
		product.ConnectivityMethod = req.ConnectivityMethod
	}
	if req.AccessProtocol != "" {
		product.AccessProtocol = req.AccessProtocol
	}
	if req.Protocols != nil {
		product.Protocols = make([]model.ProductProtocol, len(req.Protocols))
		for i, item := range req.Protocols {
			product.Protocols[i] = model.ProductProtocol{TransportProtocol: item.TransportProtocol, ApplicationProtocol: item.ApplicationProtocol}
		}
	}
	if req.AccessProtocol == "default" {
		// The default option expands to the shared HTTP and MQTT JSON endpoints.
		product.Protocols = []model.ProductProtocol{
			{TransportProtocol: "http", ApplicationProtocol: "json"},
			{TransportProtocol: "mqtt", ApplicationProtocol: "json"},
		}
	}
	if err = h.svc.Save(c, product); err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(c, v1.UpdateProductResponse{Product: productJSON(*product, 0)})
}

// Delete godoc
// @Summary Delete product
// @Schemes
// @Description Soft-deletes a product by its product key.
// @Tags Products
// @Accept json
// @Produce json
// @Security Bearer
// @Param productKey path string true "Product key"
// @Success 200 {object} v1.ApiResponse[v1.ProductSuccessResponse] "Successful response"
// @Router /products/{productKey} [delete]
func (h *ProductHandler) Delete(c *gin.Context) {
	err := h.svc.DeleteByKey(c, c.Param("productKey"))
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(c, v1.ProductSuccessResponse{Success: true})
}
