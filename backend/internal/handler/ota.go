package handler

import (
	"errors"
	"net/http"

	v1 "aiot-backend/api/v1"
	"aiot-backend/internal/dto"
	"aiot-backend/internal/model"
	"aiot-backend/internal/repository"
	"aiot-backend/internal/service"

	"github.com/dromara/carbon/v2"
	"github.com/gin-gonic/gin"
)

func otaErrorStatus(err error) int {
	if errors.Is(err, repository.ErrNotFound) {
		return http.StatusNotFound
	}
	return http.StatusInternalServerError
}

type OTAHandler struct {
	*Handler
	svc service.OTAServiceInterface
}

func NewOTAHandler(h *Handler, svc service.OTAServiceInterface) *OTAHandler {
	return &OTAHandler{Handler: h, svc: svc}
}

func otaPackageJSON(pkg model.OTAPackage) v1.OTAPackage {
	createdAt := ""
	updatedAt := ""
	var releasedAt *string
	if !pkg.CreatedAt.IsZero() {
		createdAt = carbon.CreateFromStdTime(pkg.CreatedAt).ToDateTimeString()
	}
	if !pkg.UpdatedAt.IsZero() {
		updatedAt = carbon.CreateFromStdTime(pkg.UpdatedAt).ToDateTimeString()
	}
	if pkg.ReleasedAt != nil && !pkg.ReleasedAt.IsZero() {
		formatted := carbon.CreateFromStdTime(*pkg.ReleasedAt).ToDateTimeString()
		releasedAt = &formatted
	}
	return v1.OTAPackage{
		ID: pkg.ID, UUID: pkg.UUID, PackageName: pkg.PackageName, Version: pkg.Version,
		ProductID: pkg.ProductID, ProductKey: pkg.ProductKey, ProductName: pkg.ProductName,
		PackageType: pkg.PackageType, Status: pkg.Status, UploadType: pkg.UploadType, FileURL: pkg.FileURL,
		FileSize: pkg.FileSize, Checksum: pkg.Checksum, Description: pkg.Description,
		CreatedAt: createdAt, UpdatedAt: updatedAt, ReleasedAt: releasedAt,
	}
}

func otaBatchJSON(batch model.UpgradeBatch) v1.UpgradeBatch {
	createdAt := ""
	if !batch.CreatedAt.IsZero() {
		createdAt = carbon.CreateFromStdTime(batch.CreatedAt).ToDateTimeString()
	}
	return v1.UpgradeBatch{
		BatchID:         batch.BatchID,
		UpgradeStrategy: batch.UpgradeStrategy, Status: batch.Status, TargetDeviceCount: batch.TargetDeviceCount, CreatedAt: createdAt,
	}
}

func otaDeploymentJSON(deployment dto.DeviceDeployment) v1.DeviceDeployment {
	lastStatusChangeTime := ""
	if deployment.LastStatusChangeTime != 0 {
		lastStatusChangeTime = carbon.CreateFromTimestamp(
			deployment.LastStatusChangeTime,
		).ToDateTimeString()
	}
	return v1.DeviceDeployment{
		DeviceID: deployment.DeviceID, DeviceKey: deployment.DeviceKey, DeviceName: deployment.DeviceName,
		ProductID: deployment.ProductID, ProductKey: deployment.ProductKey, CurrentVersion: deployment.CurrentVersion,
		TargetVersion: deployment.TargetVersion, Progress: deployment.Progress,
		UpgradeBatchID: deployment.UpgradeBatchID, Status: deployment.Status,
		LastStatusChangeTime: lastStatusChangeTime,
		CreatedAt:            carbon.CreateFromStdTime(deployment.CreatedAt).ToDateTimeString(),
	}
}

// ListOTA godoc
// @Summary List OTA packages
// @Schemes
// @Description Lists OTA packages.
// @Tags OTA
// @Accept json
// @Produce json
// @Security Bearer
// @Param request query v1.ListOTAPackagesRequest false "Query parameters"
// @Success 200 {object} v1.ApiResponse[v1.ListOTAPackagesResponse] "Successful response"
// @Router /ota-packages [get]
func (h *OTAHandler) ListOTA(c *gin.Context) {
	var req v1.ListOTAPackagesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	packages, total, err := h.svc.List(c, req.Page, req.PageSize)
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	items := make([]v1.OTAPackage, len(packages))
	for i, pkg := range packages {
		items[i] = otaPackageJSON(pkg)
	}
	v1.HandleSuccess(c, v1.ListOTAPackagesResponse{OTAPackages: items, Total: total, Page: req.Page, PageSize: req.PageSize})
}

// GetOTA godoc
// @Summary Get OTA package
// @Schemes
// @Description Returns OTA package.
// @Tags OTA
// @Accept json
// @Produce json
// @Security Bearer
// @Param uuid path string true "OTA package UUID"
// @Success 200 {object} v1.ApiResponse[v1.OTAPackage] "Successful response"
// @Router /ota-packages/{uuid} [get]
func (h *OTAHandler) GetOTA(c *gin.Context) {
	uuid := c.Param("uuid")
	pkg, err := h.svc.Get(c, uuid)
	if err != nil {
		v1.HandleError(c, otaErrorStatus(err), err, nil)
		return
	}
	v1.HandleSuccess(c, otaPackageJSON(*pkg))
}

// CreateOTA godoc
// @Summary Create OTA package
// @Schemes
// @Description Creates OTA package.
// @Tags OTA
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.CreateOTAPackageRequest true "params"
// @Success 200 {object} v1.ApiResponse[v1.OTAPackage] "Successful response"
// @Router /ota-packages [post]
func (h *OTAHandler) CreateOTA(c *gin.Context) {
	var req v1.CreateOTAPackageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	pkg := &model.OTAPackage{PackageName: req.PackageName, Version: req.Version, PackageType: req.PackageType, Status: req.Status, UploadType: req.UploadType, FileURL: req.FileURL, FileSize: req.FileSize, Checksum: req.Checksum, Description: req.Description}
	if pkg.Status == "" {
		pkg.Status = "draft"
	}
	if err := h.svc.Create(c, pkg, req.ProductKey); err != nil {
		v1.HandleError(c, otaErrorStatus(err), err, nil)
		return
	}
	v1.HandleSuccess(c, otaPackageJSON(*pkg))
}

// UpdateOTA godoc
// @Summary Update OTA package
// @Schemes
// @Description Updates OTA package.
// @Tags OTA
// @Accept json
// @Produce json
// @Security Bearer
// @Param uuid path string true "OTA package UUID"
// @Param request body v1.OTAPackageRequest true "params"
// @Success 200 {object} v1.ApiResponse[v1.OTAPackage] "Successful response"
// @Router /ota-packages/{uuid} [put]
func (h *OTAHandler) UpdateOTA(c *gin.Context) {
	uuid := c.Param("uuid")
	var req v1.OTAPackageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	pkg, err := h.svc.Get(c, uuid)
	if err != nil {
		v1.HandleError(c, otaErrorStatus(err), err, nil)
		return
	}
	if req.PackageName != "" {
		pkg.PackageName = req.PackageName
	}
	if req.Version != "" {
		pkg.Version = req.Version
	}
	if req.ProductID != 0 {
		pkg.ProductID = req.ProductID
	}
	if req.PackageType != "" {
		pkg.PackageType = req.PackageType
	}
	if req.Status != "" {
		pkg.Status = req.Status
	}
	if req.UploadType != "" {
		pkg.UploadType = req.UploadType
	}
	if req.FileURL != "" {
		pkg.FileURL = req.FileURL
	}
	if req.FileSize != 0 {
		pkg.FileSize = req.FileSize
	}
	if req.Checksum != "" {
		pkg.Checksum = req.Checksum
	}
	if req.Description != "" {
		pkg.Description = req.Description
	}
	if err := h.svc.Update(c, pkg); err != nil {
		v1.HandleError(c, otaErrorStatus(err), err, nil)
		return
	}
	v1.HandleSuccess(c, otaPackageJSON(*pkg))
}

// DeleteOTA godoc
// @Summary Delete OTA package
// @Schemes
// @Description Deletes OTA package.
// @Tags OTA
// @Accept json
// @Produce json
// @Security Bearer
// @Param uuid path string true "OTA package UUID"
// @Success 200 {object} v1.ApiResponse[v1.OTASuccessResponse] "Successful response"
// @Router /ota-packages/{uuid} [delete]
func (h *OTAHandler) DeleteOTA(c *gin.Context) {
	uuid := c.Param("uuid")
	if err := h.svc.Delete(c, uuid); err != nil {
		v1.HandleError(c, otaErrorStatus(err), err, nil)
		return
	}
	v1.HandleSuccess(c, v1.OTASuccessResponse{Success: true})
}

// BatchUpgradeOTA godoc
// @Summary Create OTA upgrade batch
// @Schemes
// @Description Creates OTA upgrade batch.
// @Tags OTA
// @Accept json
// @Produce json
// @Security Bearer
// @Param uuid path string true "OTA package UUID"
// @Param request body v1.BatchUpgradeRequest true "Request payload"
// @Success 200 {object} v1.ApiResponse[v1.UpgradeBatch] "Successful response"
// @Router /ota-packages/{uuid}/batch-upgrade [post]
func (h *OTAHandler) BatchUpgradeOTA(c *gin.Context) {
	uuid := c.Param("uuid")
	if uuid == "" {
		v1.HandleError(c, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}
	var req v1.BatchUpgradeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	if len(req.DeviceKeys) == 0 {
		v1.HandleError(c, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}
	batch, err := h.svc.BatchUpgrade(c, uuid, req.DeviceKeys)
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(c, otaBatchJSON(*batch))
}

func (h *OTAHandler) CancelBatch(c *gin.Context) {
	if err := h.svc.CancelBatch(c, c.Param("uuid"), c.Param("batchId")); err != nil {
		v1.HandleError(c, otaErrorStatus(err), err, nil)
		return
	}
	v1.HandleSuccess(c, v1.OTASuccessResponse{Success: true})
}

func (h *OTAHandler) RetryBatch(c *gin.Context) {
	if err := h.svc.RetryBatch(c, c.Param("uuid"), c.Param("batchId")); err != nil {
		v1.HandleError(c, otaErrorStatus(err), err, nil)
		return
	}
	v1.HandleSuccess(c, v1.OTASuccessResponse{Success: true})
}

// ReportOTAStatus godoc
// @Summary Report OTA upgrade status
// @Schemes
// @Description Reports OTA upgrade status.
// @Tags OTA
// @Accept json
// @Produce json
// @Security Bearer
// @Param uuid path string true "OTA package UUID"
// @Param request body v1.ReportOTAStatusRequest true "params"
// @Success 200 {object} v1.ApiResponse[v1.OTASuccessResponse] "Successful response"
// @Router /ota-packages/{uuid}/report [post]
func (h *OTAHandler) ReportOTAStatus(c *gin.Context) {
	uuid := c.Param("uuid")
	var req v1.ReportOTAStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	var err error
	if req.BatchID != "" {
		// Verify that the batch belongs to the current OTA package before updating deployments.
		batches, batchErr := h.svc.Batches(c, uuid)
		if batchErr != nil {
			v1.HandleError(c, otaErrorStatus(batchErr), batchErr, nil)
			return
		}
		validBatch := false
		for _, batch := range batches {
			if batch.BatchID == req.BatchID {
				validBatch = true
				break
			}
		}
		if !validBatch {
			v1.HandleError(c, http.StatusNotFound, errors.New("upgrade batch not found"), nil)
			return
		}
		err = h.svc.ReportBatchDevice(c, req.BatchID, req.DeviceKey, req.Status, req.Version, req.Progress)
	} else {
		err = h.svc.ReportStatus(c, uuid, req.DeviceKey, req.Status)
	}
	if err != nil {
		v1.HandleError(c, otaErrorStatus(err), err, nil)
		return
	}
	v1.HandleSuccess(c, v1.OTASuccessResponse{Success: true})
}

// OTAStats godoc
// @Summary Get OTA upgrade statistics
// @Schemes
// @Description Returns OTA upgrade statistics.
// @Tags OTA
// @Accept json
// @Produce json
// @Security Bearer
// @Param uuid path string true "OTA package UUID"
// @Param request query v1.OTAStatisticsRequest false "Query parameters"
// @Success 200 {object} v1.ApiResponse[v1.GetUpgradeStatisticsResponse] "Successful response"
// @Router /ota-packages/{uuid}/upgrade-statistics [get]
func (h *OTAHandler) OTAStats(c *gin.Context) {
	var req v1.OTAStatisticsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}

	var stats service.UpgradeStatistics
	var err error
	if req.BatchID != "" {
		stats, err = h.svc.Statistics(c, c.Param("uuid"), req.BatchID)
	} else {
		stats, err = h.svc.Statistics(c, c.Param("uuid"))
	}
	if err != nil {
		v1.HandleError(c, otaErrorStatus(err), err, nil)
		return
	}
	v1.HandleSuccess(c, v1.GetUpgradeStatisticsResponse{Statistics: v1.UpgradeStatistics{
		PackageID: stats.PackageID, TotalTargetDevices: stats.TotalTargetDevices,
		SuccessfulUpgrades: stats.SuccessfulUpgrades, FailedUpgrades: stats.FailedUpgrades,
		CancelledUpgrades: stats.CancelledUpgrades, PendingUpgrades: stats.PendingUpgrades,
		InProgressUpgrades: stats.InProgressUpgrades,
	}})
}

// OTABatches godoc
// @Summary List OTA upgrade batches
// @Schemes
// @Description Lists OTA upgrade batches.
// @Tags OTA
// @Accept json
// @Produce json
// @Security Bearer
// @Param uuid path string true "OTA package UUID"
// @Success 200 {object} v1.ApiResponse[v1.ListUpgradeBatchesResponse] "Successful response"
// @Router /ota-packages/{uuid}/batches [get]
func (h *OTAHandler) OTABatches(c *gin.Context) {
	batches, err := h.svc.Batches(c, c.Param("uuid"))
	if err != nil {
		v1.HandleError(c, otaErrorStatus(err), err, nil)
		return
	}
	items := make([]v1.UpgradeBatch, len(batches))
	for i, batch := range batches {
		items[i] = otaBatchJSON(batch)
	}
	v1.HandleSuccess(c, v1.ListUpgradeBatchesResponse{Items: items})
}

// OTADeployments godoc
// @Summary List OTA device deployments
// @Schemes
// @Description Lists OTA device deployments.
// @Tags OTA
// @Accept json
// @Produce json
// @Security Bearer
// @Param uuid path string true "OTA package UUID"
// @Param request query v1.ListDeviceDeploymentsRequest false "Query parameters"
// @Success 200 {object} v1.ApiResponse[v1.ListDeviceDeploymentsResponse] "Successful response"
// @Router /ota-packages/{uuid}/device-deployments [get]
func (h *OTAHandler) OTADeployments(c *gin.Context) {
	var req v1.ListDeviceDeploymentsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	var deployments []dto.DeviceDeployment
	var total int64
	var err error
	// Preserve legacy behavior by querying the entire OTA package without a batch ID.
	if req.BatchID != "" {
		deployments, total, err = h.svc.Deployments(c, c.Param("uuid"), req.Page, req.PageSize, req.Status, req.BatchID)
	} else {
		deployments, total, err = h.svc.Deployments(c, c.Param("uuid"), req.Page, req.PageSize, req.Status)
	}
	if err != nil {
		v1.HandleError(c, otaErrorStatus(err), err, nil)
		return
	}
	items := make([]v1.DeviceDeployment, len(deployments))
	for i, deployment := range deployments {
		items[i] = otaDeploymentJSON(deployment)
	}
	v1.HandleSuccess(c, v1.ListDeviceDeploymentsResponse{Items: items, Total: total, Page: req.Page, PageSize: req.PageSize})
}
