package service

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"aiot-backend/internal/event"
	"aiot-backend/internal/dto"
	"aiot-backend/internal/enum"
	"aiot-backend/internal/model"
	"aiot-backend/internal/repository"

	gouuid "github.com/google/uuid"
)

type OTAServiceInterface interface {
	List(ctx context.Context, page, size int) ([]model.OTAPackage, int64, error)
	Get(ctx context.Context, uuid string) (*model.OTAPackage, error)
	Create(ctx context.Context, pkg *model.OTAPackage, productKey string) error
	Update(ctx context.Context, pkg *model.OTAPackage) error
	Delete(ctx context.Context, uuid string) error
	BatchUpgrade(ctx context.Context, uuid string, deviceKeys []string) (*model.OTAUpgradeBatch, error)
	ReportStatus(ctx context.Context, uuid string, deviceKey string, status string) error
	ReportBatchDevice(ctx context.Context, batchID, deviceKey, status, version string, progress int32, desc ...string) error
	Statistics(ctx context.Context, uuid string, batchID ...string) (UpgradeStatistics, error)
	Batches(ctx context.Context, uuid string) ([]model.OTAUpgradeBatch, error)
	Deployments(ctx context.Context, uuid string, page, size int, status string, batchID ...string) ([]dto.DeviceDeployment, int64, error)
	CancelBatch(ctx context.Context, uuid, batchID string) error
	RetryBatch(ctx context.Context, uuid, batchID string) error
}

func (s *OTAService) batchPackage(ctx context.Context, uuid, batchID string) (*model.OTAPackage, error) {
	pkg, err := s.repo.FindByUUID(ctx, uuid)
	if err != nil {
		return nil, err
	}
	if _, err := s.repo.FindBatch(ctx, pkg.ID, batchID); err != nil {
		return nil, repository.ErrNotFound
	}
	return pkg, nil
}

func (s *OTAService) CancelBatch(ctx context.Context, uuid, batchID string) error {
	pkg, err := s.batchPackage(ctx, uuid, batchID)
	if err != nil {
		return err
	}
	if err := s.repo.UpdateBatchDevicesStatus(ctx, pkg.ID, batchID, []string{enum.OTAStatusPending, enum.OTAStatusSent, enum.OTAStatusInProgress}, enum.OTAStatusCancelled); err != nil {
		return err
	}
	return s.repo.UpdateBatchStatus(ctx, batchID, enum.OTAStatusCancelled)
}

func (s *OTAService) RetryBatch(ctx context.Context, uuid, batchID string) error {
	pkg, err := s.batchPackage(ctx, uuid, batchID)
	if err != nil {
		return err
	}
	retryLimited, err := s.repo.CountRetryLimited(ctx, pkg.ID, batchID)
	if err != nil {
		return err
	}
	if retryLimited > 0 {
		return errors.New("OTA retry limit exceeded")
	}
	if err := s.repo.UpdateBatchDevicesStatus(ctx, pkg.ID, batchID, []string{enum.OTAStatusFailed, enum.OTAStatusTimeout}, enum.OTAStatusPending); err != nil {
		return err
	}
	return s.repo.UpdateBatchStatus(ctx, batchID, enum.OTAStatusPending)
}

type OTAService struct {
	repo          *repository.OTARepository
	productRepo   *repository.ProductRepository
	deviceRepo    *repository.DeviceRepository
	eventProducer event.Producer
}

type UpgradeStatistics struct {
	PackageID          string
	TotalTargetDevices int64
	SuccessfulUpgrades int64
	FailedUpgrades     int64
	CancelledUpgrades  int64
	PendingUpgrades    int64
	InProgressUpgrades int64
}

func NewOTAService(repo *repository.OTARepository, productRepo *repository.ProductRepository, deviceRepo *repository.DeviceRepository, eventProducer event.Producer) *OTAService {
	return &OTAService{repo: repo, productRepo: productRepo, deviceRepo: deviceRepo, eventProducer: eventProducer}
}

func (s *OTAService) List(ctx context.Context, page, size int) ([]model.OTAPackage, int64, error) {
	return s.repo.List(ctx, page, size)
}

func (s *OTAService) Get(ctx context.Context, uuid string) (*model.OTAPackage, error) {
	return s.repo.FindByUUID(ctx, uuid)
}

func (s *OTAService) Create(ctx context.Context, pkg *model.OTAPackage, productKey string) error {
	product, err := s.productRepo.FindByKey(ctx, productKey)
	if err != nil {
		return err
	}
	pkg.ProductID = product.ID
	pkg.ProductKey = product.ProductKey
	pkg.ProductName = product.Name
	if pkg.UUID == "" {
		pkg.UUID = gouuid.NewString()
	}
	return s.repo.Create(ctx, pkg)
}

func (s *OTAService) Update(ctx context.Context, pkg *model.OTAPackage) error {
	if _, err := s.productRepo.Find(ctx, pkg.ProductID); err != nil {
		return err
	}
	return s.repo.Save(ctx, pkg)
}

func (s *OTAService) Delete(ctx context.Context, uuid string) error {
	pkg, err := s.repo.FindByUUID(ctx, uuid)
	if err != nil {
		return err
	}
	return s.repo.Delete(ctx, pkg.ID)
}

// BatchUpgrade creates a static upgrade batch for the specified package and devices,
// creating records in pending status and setting the package status to deploying.
func (s *OTAService) BatchUpgrade(ctx context.Context, uuid string, deviceKeys []string) (*model.UpgradeBatch, error) {
	pkg, err := s.repo.FindByUUID(ctx, uuid)
	if err != nil {
		return nil, err
	}
	devices, err := s.deviceRepo.FindByKeys(ctx, deviceKeys)
	if err != nil {
		return nil, err
	}
	if len(devices) == 0 {
		return nil, errors.New("no valid devices found for the given device keys")
	}

	seenDev := make(map[int64]struct{}, len(devices))
	uniqueDevices := make([]*model.Device, 0, len(devices))
	deviceIDs := make([]int64, 0, len(devices))
	for _, d := range devices {
		if _, exists := seenDev[d.ID]; exists {
			continue
		}
		seenDev[d.ID] = struct{}{}
		uniqueDevices = append(uniqueDevices, d)
		deviceIDs = append(deviceIDs, d.ID)
	}

	batchID := gouuid.NewString()
	batch := &model.UpgradeBatch{
		BatchID:           batchID,
		OTAPackageID:      strconv.FormatInt(pkg.ID, 10),
		UpgradeStrategy:   "static",
		Status:            enum.OTAStatusPending,
		TargetDeviceCount: int32(len(deviceIDs)),
	}
	if err := s.repo.CreateBatchWithDeployments(ctx, batch, pkg.ID, deviceIDs, pkg.Version); err != nil {
		return batch, err
	}
	pkg, err = s.repo.Find(ctx, pkg.ID)
	if err != nil {
		return batch, err
	}
	pkg.Status = enum.OTAPackageDeploying
	if err := s.repo.Save(ctx, pkg); err != nil {
		return batch, err
	}

	for _, d := range uniqueDevices {
		protocol := strings.ToLower(d.Product.AccessProtocol)
		if protocol == "" {
			protocol = "mqtt"
		}

		// Protocol differentiation: MQTT devices receive active push event;
		// HTTP devices pull firmware metadata on polling without an immediate push event.
		if protocol != "http" && s.eventProducer != nil {
			cmd := &event.OTAUpgradeCommand{
				BatchID:       batchID,
				PackageID:     strconv.FormatInt(pkg.ID, 10),
				ProductKey:    pkg.ProductKey,
				DeviceKey:     d.DeviceKey,
				DeviceName:    d.Name,
				Transport:     protocol,
				Module:        pkg.PackageType,
				TargetVersion: pkg.Version,
				DownloadURL:   pkg.FileURL,
				FileSize:      pkg.FileSize,
				SHA256:        pkg.Checksum,
				ExpiresAt:     time.Now().Add(24 * time.Hour),
			}
			_ = s.eventProducer.Publish(ctx, event.TopicOTAUpgradeCommand, cmd)
		}
	}

	return batch, nil
}

// ReportStatus updates the upgrade status for a device against a package.
func (s *OTAService) ReportStatus(ctx context.Context, uuid string, deviceKey string, status string) error {
	if status != enum.OTAStatusInProgress && status != enum.OTAStatusSuccess && status != enum.OTAStatusFailed {
		return errors.New("invalid upgrade status: " + status)
	}
	pkg, err := s.repo.FindByUUID(ctx, uuid)
	if err != nil {
		return err
	}
	device, err := s.deviceRepo.FindByKey(ctx, deviceKey)
	if err != nil {
		return err
	}
	if err := s.repo.UpdateDeviceStatus(ctx, pkg.ID, device.ID, status, ""); err != nil {
		return err
	}
	return s.recomputePackageStatus(ctx, pkg.ID)
}

// ReportBatchDevice handles device progress/status report, validates version matching and timeout,
// and updates the batch and package status accordingly.
func (s *OTAService) ReportBatchDevice(ctx context.Context, batchID, deviceKey, status, version string, progress int32, desc ...string) error {
	if status != enum.OTAStatusInProgress && status != enum.OTAStatusSuccess && status != enum.OTAStatusFailed && status != enum.OTAStatusTimeout {
		return errors.New("invalid upgrade status: " + status)
	}
	device, err := s.deviceRepo.FindByKeyForEvent(ctx, deviceKey)
	if err != nil {
		return err
	}
	var targetVersion string
	var packageID string
	batch, err := s.repo.FindBatchByID(ctx, batchID)
	if err != nil {
		return err
	}
	packageID = batch.OTAPackageID
	task, err := s.repo.FindBatchDevice(ctx, batchID, device.ID)
	if err != nil {
		return err
	}
	targetVersion = task.TargetVersion
	if task.FirstProgressAt != nil && task.TimeoutSeconds > 0 && time.Now().Unix()-*task.FirstProgressAt > int64(task.TimeoutSeconds) {
		status = enum.OTAStatusTimeout
	}
	if status != enum.OTAStatusTimeout && version != "" && version == targetVersion {
		status = enum.OTAStatusSuccess
	}
	var errorDesc string
	if len(desc) > 0 {
		errorDesc = desc[0]
	}
	if err := s.repo.UpdateBatchDeviceStatus(ctx, batchID, device.ID, status, version, progress, errorDesc); err != nil {
		return err
	}
	packageIDValue, err := strconv.ParseInt(packageID, 10, 64)
	if err != nil {
		return err
	}
	if err := s.recomputePackageStatus(ctx, packageIDValue); err != nil {
		return err
	}
	return s.recomputeBatchStatus(ctx, batchID, packageIDValue)
}

// recomputeBatchStatus updates the batch status based on its device status aggregation.
func (s *OTAService) recomputeBatchStatus(ctx context.Context, batchID string, packageID int64) error {
	counts, err := s.repo.Statistics(ctx, packageID, batchID)
	if err != nil {
		return err
	}
	status := enum.OTAStatusSuccess
	if counts.Pending > 0 || counts.InProgress > 0 {
		status = enum.OTAStatusPending
	} else if counts.Failed > 0 && counts.Success > 0 {
		status = enum.OTAPackagePartial
	} else if counts.Failed > 0 {
		status = enum.OTAStatusFailed
	}
	return s.repo.UpdateBatchStatus(ctx, batchID, status)
}

// ClaimBatchDeviceForMQTT atomically claims the upgrade task to prevent duplicate MQTT dispatch.
func (s *OTAService) ClaimBatchDeviceForMQTT(ctx context.Context, batchID, deviceKey string) (bool, error) {
	return s.repo.ClaimBatchDeviceForMQTT(ctx, batchID, deviceKey)
}

// ResetMQTTDispatch resets a failed MQTT dispatch task back to pending for explicit retry.
func (s *OTAService) ResetMQTTDispatch(ctx context.Context, batchID, deviceKey, dispatchError string) error {
	return s.repo.ResetMQTTDispatch(ctx, batchID, deviceKey, dispatchError)
}

// recomputePackageStatus updates the overall package status based on device status aggregation:
// stays deploying if pending/in_progress remain; success if all succeeded; failed if all failed; partial if mixed.
func (s *OTAService) recomputePackageStatus(ctx context.Context, packageID int64) error {
	counts, err := s.repo.Statistics(ctx, packageID)
	if err != nil {
		return err
	}
	if counts.Pending > 0 || counts.InProgress > 0 {
		return nil
	}
	pkg, err := s.repo.Find(ctx, packageID)
	if err != nil {
		return err
	}
	switch {
	case counts.Failed == 0:
		pkg.Status = enum.OTAStatusSuccess
	case counts.Success == 0:
		pkg.Status = enum.OTAStatusFailed
	default:
		pkg.Status = enum.OTAPackagePartial
	}
	return s.repo.Save(ctx, pkg)
}

func (s *OTAService) Statistics(ctx context.Context, uuid string, batchID ...string) (UpgradeStatistics, error) {
	pkg, err := s.repo.FindByUUID(ctx, uuid)
	if err != nil {
		return UpgradeStatistics{}, err
	}
	counts, err := s.repo.Statistics(ctx, pkg.ID, batchID...)
	if err != nil {
		return UpgradeStatistics{}, err
	}
	return UpgradeStatistics{
		PackageID: strconv.FormatInt(pkg.ID, 10), TotalTargetDevices: counts.Total,
		SuccessfulUpgrades: counts.Success, FailedUpgrades: counts.Failed,
		CancelledUpgrades: counts.Cancelled, PendingUpgrades: counts.Pending,
		InProgressUpgrades: counts.InProgress,
	}, nil
}

func (s *OTAService) Batches(ctx context.Context, uuid string) ([]model.UpgradeBatch, error) {
	pkg, err := s.repo.FindByUUID(ctx, uuid)
	if err != nil {
		return nil, err
	}
	return s.repo.Batches(ctx, pkg.ID)
}

func (s *OTAService) Deployments(ctx context.Context, uuid string, page, size int, status string, batchID ...string) ([]dto.DeviceDeployment, int64, error) {
	pkg, err := s.repo.FindByUUID(ctx, uuid)
	if err != nil {
		return nil, 0, err
	}
	return s.repo.Deployments(ctx, pkg.ID, page, size, status, batchID...)
}
