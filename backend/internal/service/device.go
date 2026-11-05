package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"aiot-backend/internal/dto"
	"aiot-backend/internal/model"
	"aiot-backend/internal/repository"
	"aiot-backend/internal/security"
	"aiot-backend/internal/tenant"

	"github.com/google/uuid"
	"github.com/spf13/viper"
	"github.com/xuri/excelize/v2"
)

type DeviceServiceInterface interface {
	CreateDevice(ctx context.Context, d *model.Device) (*model.Device, error)
	Device(ctx context.Context, id int64) (*model.Device, error)
	DeviceByKey(ctx context.Context, key string) (*model.Device, error)
	ListDevices(ctx context.Context, query dto.ListDevicesQuery) ([]model.Device, int64, error)
	UpdateDevice(ctx context.Context, id int64, name string, state *int) (*model.Device, error)
	UpdateDeviceByKey(ctx context.Context, deviceKey string, name string, state *int) (*model.Device, error)
	Activate(ctx context.Context, id int64) (*model.Device, error)
	ActivateByKey(ctx context.Context, deviceKey string) (*model.Device, error)
	SetEnabled(ctx context.Context, id int64, v bool) (*model.Device, error)
	SetEnabledByKey(ctx context.Context, deviceKey string, v bool) (*model.Device, error)
	DeleteDevice(ctx context.Context, id int64) error
	DeleteDeviceByKey(ctx context.Context, deviceKey string) error
	Stats(ctx context.Context) (DeviceStatistics, error)
	Tags(ctx context.Context, key string) ([]model.DeviceTag, error)
	SetTags(ctx context.Context, key string, tags map[string]string, replace bool) ([]model.DeviceTag, error)
	RemoveTags(ctx context.Context, key string, keys []string) error
	Shadow(ctx context.Context, key string) (*model.DeviceShadow, error)
	MutateShadow(ctx context.Context, key string, version int64, source string, desired, reported *map[string]any, clear bool) (*model.DeviceShadow, error)
	ShadowHistory(ctx context.Context, key string) ([]model.DeviceShadowHistory, error)
	Telemetry(ctx context.Context, key string) (string, error)
	SimulatePush(ctx context.Context, deviceKey, payload, createdBy string) (*model.DevicePushRecord, error)
	ListPushRecords(ctx context.Context, deviceKey string, page, size int, operationType, status string) ([]model.DevicePushRecord, int64, error)
	PushRecord(ctx context.Context, id int64) (*model.DevicePushRecord, error)
	ClearPushRecords(ctx context.Context, deviceKey string, before *time.Time) (int64, error)
	BatchTemplate() ([]byte, error)
	BatchCreate(ctx context.Context, content []byte) (int, []BatchUploadError, error)
}

type DeviceService struct {
	repo        *repository.DeviceRepository
	products    *repository.ProductRepository
	tags        *repository.DeviceTagRepository
	shadows     *repository.DeviceShadowRepository
	pushRecords *repository.PushRecordRepository
	config      *viper.Viper
}

type BatchUploadError struct {
	Row        int
	ProductKey string
	DeviceName string
	Error      string
}

type DeviceStatistics struct {
	TotalDevices     int64
	ActivatedDevices int64
	OnlineDevices    int64
	OfflineDevices   int64
	InactiveDevices  int64
}

func NewDeviceService(
	repo *repository.DeviceRepository,
	products *repository.ProductRepository,
	tags *repository.DeviceTagRepository,
	shadows *repository.DeviceShadowRepository,
	pushRecords *repository.PushRecordRepository,
	config *viper.Viper,
) *DeviceService {
	return &DeviceService{
		repo:        repo,
		products:    products,
		tags:        tags,
		shadows:     shadows,
		pushRecords: pushRecords,
		config:      config,
	}
}

func (s *DeviceService) CreateDevice(ctx context.Context, d *model.Device) (*model.Device, error) {
	if _, err := s.products.Find(ctx, d.ProductID); err != nil {
		return nil, err
	}
	if d.DeviceKey == "" {
		d.DeviceKey = uuid.NewString()
	}
	d.DeviceUUID = uuid.NewString()
	d.OrganizationID = tenant.GetOrganizationID(ctx)
	credential, err := newDeviceCredential(d.DeviceUUID, s.config.GetString("security.device_credentials_key"))
	if err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, d, credential); err != nil {
		return nil, err
	}
	return s.repo.Find(ctx, d.ID)
}

func newDeviceCredential(deviceUUID, encryptionKey string) (*model.DeviceCredential, error) {
	password := rand.Text()[:10]
	saltBytes := make([]byte, 16)
	if _, err := rand.Read(saltBytes); err != nil {
		return nil, err
	}

	salt := hex.EncodeToString(saltBytes)
	hash := sha256.Sum256([]byte(password + salt))
	username := deviceUUID
	ciphertext, err := security.EncryptCredentials(password, encryptionKey)
	if err != nil {
		return nil, err
	}

	return &model.DeviceCredential{
		DeviceUUID:         deviceUUID,
		CredentialType:     "mqtt",
		Username:           username,
		Password:           hex.EncodeToString(hash[:]),
		Salt:               salt,
		PasswordCiphertext: ciphertext,
		Enabled:            true,
	}, nil
}
func (s *DeviceService) Device(ctx context.Context, id int64) (*model.Device, error) {
	return s.repo.Find(ctx, id)
}
func (s *DeviceService) DeviceByKey(ctx context.Context, key string) (*model.Device, error) {
	return s.repo.FindByKey(ctx, key)
}
func (s *DeviceService) ListDevices(ctx context.Context, query dto.ListDevicesQuery) ([]model.Device, int64, error) {
	return s.repo.List(ctx, query)
}
func (s *DeviceService) UpdateDevice(ctx context.Context, id int64, name string, state *int) (*model.Device, error) {
	d, err := s.Device(ctx, id)
	if err != nil {
		return nil, err
	}
	if name != "" {
		d.Name = name
	}
	if state != nil && *state != d.State.State {
		valid := map[int][]int{
			model.DeviceStateInactive: {model.DeviceStateOffline},
			model.DeviceStateOffline:  {model.DeviceStateOnline},
			model.DeviceStateOnline:   {model.DeviceStateOffline},
		}
		ok := false
		for _, v := range valid[d.State.State] {
			if v == *state {
				ok = true
			}
		}
		if !ok {
			return nil, errors.New("invalid status transition")
		}
		d.State.State = *state
	}
	err = s.repo.Save(ctx, d)
	if err != nil {
		return nil, err
	}
	return s.Device(ctx, id)
}
func (s *DeviceService) UpdateDeviceByKey(ctx context.Context, deviceKey string, name string, state *int) (*model.Device, error) {
	d, err := s.DeviceByKey(ctx, deviceKey)
	if err != nil {
		return nil, err
	}
	return s.UpdateDevice(ctx, d.ID, name, state)
}
func (s *DeviceService) Activate(ctx context.Context, id int64) (*model.Device, error) {
	d, err := s.Device(ctx, id)
	if err != nil {
		return nil, err
	}
	if d.State.State != model.DeviceStateInactive {
		return nil, errors.New("device already activated")
	}
	offline := model.DeviceStateOffline
	return s.UpdateDevice(ctx, id, "", &offline)
}
func (s *DeviceService) ActivateByKey(ctx context.Context, deviceKey string) (*model.Device, error) {
	d, err := s.DeviceByKey(ctx, deviceKey)
	if err != nil {
		return nil, err
	}
	return s.Activate(ctx, d.ID)
}
func (s *DeviceService) SetEnabled(ctx context.Context, id int64, v bool) (*model.Device, error) {
	d, err := s.Device(ctx, id)
	if err != nil {
		return nil, err
	}
	d.Enabled = v
	err = s.repo.SaveEnabled(ctx, d)
	return d, err
}
func (s *DeviceService) SetEnabledByKey(ctx context.Context, deviceKey string, v bool) (*model.Device, error) {
	d, err := s.DeviceByKey(ctx, deviceKey)
	if err != nil {
		return nil, err
	}
	return s.SetEnabled(ctx, d.ID, v)
}

func (s *DeviceService) Tags(ctx context.Context, key string) ([]model.DeviceTag, error) {
	d, err := s.DeviceByKey(ctx, key)
	if err != nil {
		return nil, err
	}
	return s.tags.ListTags(ctx, d.ID)
}
func (s *DeviceService) SetTags(ctx context.Context, key string, tags map[string]string, replace bool) ([]model.DeviceTag, error) {
	d, err := s.DeviceByKey(ctx, key)
	if err != nil {
		return nil, err
	}
	for k := range tags {
		if k == "" || len(k) > 128 {
			return nil, errors.New("invalid tag key")
		}
		if isNumericKey(k) {
			return nil, errors.New("tag key cannot be purely numeric")
		}
	}
	err = s.tags.SetTags(ctx, d.ID, tags, replace)
	if err != nil {
		return nil, err
	}
	return s.Tags(ctx, key)
}
func (s *DeviceService) RemoveTags(ctx context.Context, key string, keys []string) error {
	d, err := s.DeviceByKey(ctx, key)
	if err != nil {
		return err
	}
	return s.tags.DeleteTags(ctx, d.ID, keys)
}
func isNumericKey(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
func (s *DeviceService) Shadow(ctx context.Context, key string) (*model.DeviceShadow, error) {
	d, err := s.DeviceByKey(ctx, key)
	if err != nil {
		return nil, err
	}
	return s.shadows.GetShadow(ctx, d.ID)
}
func (s *DeviceService) MutateShadow(ctx context.Context, key string, version int64, source string, desired, reported *map[string]any, clear bool) (*model.DeviceShadow, error) {
	d, err := s.DeviceByKey(ctx, key)
	if err != nil {
		return nil, err
	}
	return s.shadows.MutateShadow(ctx, d.ID, version, source, desired, reported, clear)
}
func (s *DeviceService) ShadowHistory(ctx context.Context, key string) ([]model.DeviceShadowHistory, error) {
	d, err := s.DeviceByKey(ctx, key)
	if err != nil {
		return nil, err
	}
	return s.shadows.ListShadowHistory(ctx, d.ID)
}
func (s *DeviceService) Telemetry(ctx context.Context, key string) (string, error) {
	return s.repo.Telemetry(ctx, key)
}
func (s *DeviceService) Stats(ctx context.Context) (DeviceStatistics, error) {
	counts, err := s.repo.Statistics(ctx)
	if err != nil {
		return DeviceStatistics{}, err
	}
	return DeviceStatistics{
		TotalDevices: counts.TotalDevices, ActivatedDevices: counts.ActivatedDevices,
		OnlineDevices: counts.OnlineDevices, OfflineDevices: counts.OfflineDevices, InactiveDevices: counts.InactiveDevices,
	}, nil
}
func (s *DeviceService) DeleteDevice(ctx context.Context, id int64) error {
	d, err := s.Device(ctx, id)
	if err != nil {
		return err
	}
	return s.repo.Delete(ctx, d)
}
func (s *DeviceService) DeleteDeviceByKey(ctx context.Context, deviceKey string) error {
	d, err := s.DeviceByKey(ctx, deviceKey)
	if err != nil {
		return err
	}
	return s.DeleteDevice(ctx, d.ID)
}

func (s *DeviceService) SimulatePush(ctx context.Context, deviceKey, payload, createdBy string) (*model.DevicePushRecord, error) {
	device, err := s.DeviceByKey(ctx, deviceKey)
	if err != nil {
		return nil, err
	}
	if createdBy == "" {
		createdBy = "system"
	}
	record := &model.DevicePushRecord{
		DeviceID:      device.ID,
		OperationType: "Property",
		OperationName: "simulate",
		Payload:       payload,
		Status:        "success",
		CreatedBy:     createdBy,
	}
	if err := s.pushRecords.CreatePushRecord(ctx, record); err != nil {
		return nil, err
	}
	return record, nil
}

func (s *DeviceService) ListPushRecords(ctx context.Context, deviceKey string, page, size int, operationType, status string) ([]model.DevicePushRecord, int64, error) {
	device, err := s.DeviceByKey(ctx, deviceKey)
	if err != nil {
		return nil, 0, err
	}
	return s.pushRecords.ListPushRecords(ctx, device.ID, page, size, operationType, status)
}

func (s *DeviceService) PushRecord(ctx context.Context, id int64) (*model.DevicePushRecord, error) {
	return s.pushRecords.FindPushRecord(ctx, id)
}

func (s *DeviceService) ClearPushRecords(ctx context.Context, deviceKey string, before *time.Time) (int64, error) {
	device, err := s.DeviceByKey(ctx, deviceKey)
	if err != nil {
		return 0, err
	}
	return s.pushRecords.DeletePushRecords(ctx, device.ID, before)
}
func (s *DeviceService) BatchTemplate() ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()
	sheet := "设备导入模板"
	f.SetSheetName("Sheet1", sheet)
	f.SetCellValue(sheet, "A1", "productKey")
	f.SetCellValue(sheet, "B1", "deviceName")
	f.SetCellValue(sheet, "A2", "WMS003")
	f.SetCellValue(sheet, "B2", "DEV001")
	var b bytes.Buffer
	err := f.Write(&b)
	return b.Bytes(), err
}
func (s *DeviceService) BatchCreate(ctx context.Context, content []byte) (int, []BatchUploadError, error) {
	f, err := excelize.OpenReader(bytes.NewReader(content))
	if err != nil {
		return 0, nil, err
	}
	defer f.Close()
	rows, err := f.GetRows(f.GetSheetName(0))
	if err != nil {
		return 0, nil, err
	}
	if len(rows) < 2 {
		return 0, nil, errors.New("no valid data rows")
	}
	head := map[string]int{}
	for i, v := range rows[0] {
		head[strings.ToLower(strings.TrimSpace(v))] = i
	}
	pk, ok1 := head["productkey"]
	dn, ok2 := head["devicename"]
	if !ok1 || !ok2 {
		return 0, nil, errors.New("missing required column")
	}
	success := 0
	errs := []BatchUploadError{}
	for i, row := range rows[1:] {
		val := func(n int) string {
			if n < len(row) {
				return strings.TrimSpace(row[n])
			}
			return ""
		}
		key, name := val(pk), val(dn)
		if key == "" && name == "" {
			continue
		}
		p, e := s.products.FindByKey(ctx, key)
		if e == nil {
			_, e = s.CreateDevice(ctx, &model.Device{Name: name, ProductID: p.ID})
		}
		if e != nil {
			errs = append(errs, BatchUploadError{Row: i + 2, ProductKey: key, DeviceName: name, Error: e.Error()})
		} else {
			success++
		}
	}
	return success, errs, nil
}
