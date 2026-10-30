package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	v1 "aiot-backend/api/v1"
	"aiot-backend/internal/service"
	"aiot-backend/internal/tenant"

	"github.com/dromara/carbon/v2"
	"github.com/gin-gonic/gin"
)

type OrganizationHandler struct {
	*Handler
	svc service.OrganizationProvisioningServiceInterface
}

func NewOrganizationHandler(h *Handler, svc service.OrganizationProvisioningServiceInterface) *OrganizationHandler {
	return &OrganizationHandler{Handler: h, svc: svc}
}

func orgIDFromContext(c *gin.Context) string {
	if orgID := c.GetString(string(tenant.OrganizationKey)); orgID != "" {
		return orgID
	}
	return tenant.GetOrganizationID(c.Request.Context())
}

// CreateOrganization godoc
// @Summary Create a Logto organization and join it
// @Tags Organizations
// @Accept json
// @Produce json
// @Security Bearer
// @Param body body v1.CreateOrganizationReq true "Organization name"
// @Success 200 {object} v1.ApiResponse[map[string]string]
// @Router /organizations [post]
func (h *OrganizationHandler) CreateOrganization(c *gin.Context) {
	userID := userIDFromContext(c)
	if userID == "" {
		v1.HandleError(c, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}
	var req v1.CreateOrganizationReq
	if err := c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		v1.HandleError(c, http.StatusBadRequest, errors.New("organization name is required"), nil)
		return
	}
	organizationID, err := h.svc.CreateOrganization(c.Request.Context(), userID, req.Name)
	if err != nil {
		v1.HandleError(c, http.StatusBadGateway, err, nil)
		return
	}
	v1.HandleSuccess(c, map[string]string{"organizationId": organizationID})
}

// CreateInvitation godoc
// @Summary Create an invitation to current organization
// @Tags Organizations
// @Accept json
// @Produce json
// @Security Bearer
// @Param body body v1.CreateOrganizationInvitationReq true "Invitation Request"
// @Success 200 {object} v1.ApiResponse[v1.OrganizationInvitationResp]
// @Router /organizations/invitations [post]
func (h *OrganizationHandler) CreateInvitation(c *gin.Context) {
	orgID := orgIDFromContext(c)
	if orgID == "" {
		v1.HandleError(c, http.StatusBadRequest, errors.New("organization context is required"), nil)
		return
	}
	userID := userIDFromContext(c)
	if userID == "" {
		v1.HandleError(c, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.CreateOrganizationInvitationReq
	if err := c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}

	inv, err := h.svc.CreateInvitation(c.Request.Context(), orgID, userID, req.Invitee)
	if err != nil {
		v1.HandleError(c, http.StatusBadGateway, err, nil)
		return
	}

	v1.HandleSuccess(c, toInvitationResp(inv))
}

// ListInvitations godoc
// @Summary List invitations in current organization
// @Tags Organizations
// @Produce json
// @Security Bearer
// @Param page query int false "Page number" default(1)
// @Param pageSize query int false "Entries per page" default(10)
// @Success 200 {object} v1.ApiResponse[v1.ListOrganizationInvitationsResp]
// @Router /organizations/invitations [get]
func (h *OrganizationHandler) ListInvitations(c *gin.Context) {
	orgID := orgIDFromContext(c)
	if orgID == "" {
		v1.HandleError(c, http.StatusBadRequest, errors.New("organization context is required"), nil)
		return
	}

	var pageReq v1.PageRequest
	if err := c.ShouldBindQuery(&pageReq); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	invs, total, pendingCount, err := h.svc.ListInvitations(c.Request.Context(), orgID, pageReq.Page, pageReq.PageSize)
	if err != nil {
		v1.HandleError(c, http.StatusBadGateway, err, nil)
		return
	}

	v1.HandleSuccess(c, v1.ListOrganizationInvitationsResp{Items: toInvitationRespList(invs), Total: total, PendingCount: pendingCount, Page: pageReq.Page, PageSize: pageReq.PageSize})
}

// DeleteInvitation godoc
// @Summary Revoke an invitation
// @Tags Organizations
// @Produce json
// @Security Bearer
// @Param id path string true "Invitation ID"
// @Success 200 {object} v1.ApiResponse[any]
// @Router /organizations/invitations/{id} [delete]
func (h *OrganizationHandler) DeleteInvitation(c *gin.Context) {
	orgID := orgIDFromContext(c)
	if orgID == "" {
		v1.HandleError(c, http.StatusBadRequest, errors.New("organization context is required"), nil)
		return
	}
	invitationID := c.Param("id")
	if invitationID == "" {
		v1.HandleError(c, http.StatusBadRequest, errors.New("invitation id is required"), nil)
		return
	}

	if err := h.svc.DeleteInvitation(c.Request.Context(), orgID, invitationID); err != nil {
		if errors.Is(err, service.ErrInvitationForbidden) {
			v1.HandleError(c, http.StatusForbidden, err, nil)
			return
		}
		v1.HandleError(c, http.StatusBadGateway, err, nil)
		return
	}

	v1.HandleSuccess(c, nil)
}

// GetInvitation godoc
// @Summary Get an organization invitation details
// @Tags Organizations
// @Produce json
// @Security Bearer
// @Param id path string true "Invitation ID"
// @Success 200 {object} v1.ApiResponse[v1.OrganizationInvitationResp]
// @Router /organizations/invitations/{id} [get]
func (h *OrganizationHandler) GetInvitation(c *gin.Context) {
	invitationID := c.Param("id")
	if invitationID == "" {
		v1.HandleError(c, http.StatusBadRequest, errors.New("invitation id is required"), nil)
		return
	}

	userID := userIDFromContext(c)
	if userID == "" {
		v1.HandleError(c, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}
	inv, err := h.svc.GetInvitation(c.Request.Context(), invitationID, userID)
	if err != nil {
		if errors.Is(err, service.ErrInvitationForbidden) {
			v1.HandleError(c, http.StatusForbidden, err, nil)
			return
		}
		v1.HandleError(c, http.StatusBadGateway, err, nil)
		return
	}

	v1.HandleSuccess(c, toInvitationResp(inv))
}

// AcceptInvitation godoc
// @Summary Accept an organization invitation
// @Tags Organizations
// @Produce json
// @Security Bearer
// @Param id path string true "Invitation ID"
// @Success 200 {object} v1.ApiResponse[any]
// @Router /organizations/invitations/{id}/accept [post]
func (h *OrganizationHandler) AcceptInvitation(c *gin.Context) {
	invitationID := c.Param("id")
	if invitationID == "" {
		v1.HandleError(c, http.StatusBadRequest, errors.New("invitation id is required"), nil)
		return
	}

	userID := userIDFromContext(c)
	if userID == "" {
		v1.HandleError(c, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}
	if err := h.svc.AcceptInvitation(c.Request.Context(), invitationID, userID); err != nil {
		if errors.Is(err, service.ErrInvitationForbidden) {
			v1.HandleError(c, http.StatusForbidden, err, nil)
			return
		}
		if errors.Is(err, service.ErrInvitationUnavailable) {
			v1.HandleError(c, http.StatusConflict, err, nil)
			return
		}
		v1.HandleError(c, http.StatusBadGateway, err, nil)
		return
	}

	v1.HandleSuccess(c, nil)
}

// ListMembers godoc
// @Summary List members in current organization
// @Tags Organizations
// @Produce json
// @Security Bearer
// @Param request query v1.ListOrganizationMembersRequest false "Query parameters"
// @Success 200 {object} v1.ApiResponse[v1.ListOrganizationMembersResp]
// @Router /organizations/members [get]
func (h *OrganizationHandler) ListMembers(c *gin.Context) {
	orgID := orgIDFromContext(c)
	if orgID == "" {
		v1.HandleError(c, http.StatusBadRequest, errors.New("organization context is required"), nil)
		return
	}

	var req v1.ListOrganizationMembersRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	members, hasNext, err := h.svc.ListMembers(c.Request.Context(), orgID, req.Query, req.Page, req.PageSize)
	if err != nil {
		v1.HandleError(c, http.StatusBadGateway, err, nil)
		return
	}

	v1.HandleSuccess(c, v1.ListOrganizationMembersResp{Items: toMemberRespList(members), Page: req.Page, PageSize: req.PageSize, HasNext: hasNext})
}

// RemoveMember godoc
// @Summary Remove a member from current organization
// @Tags Organizations
// @Produce json
// @Security Bearer
// @Param userId path string true "User ID"
// @Success 200 {object} v1.ApiResponse[any]
// @Router /organizations/members/{userId} [delete]
func (h *OrganizationHandler) RemoveMember(c *gin.Context) {
	orgID := orgIDFromContext(c)
	if orgID == "" {
		v1.HandleError(c, http.StatusBadRequest, errors.New("organization context is required"), nil)
		return
	}
	targetUserID := c.Param("userId")
	if targetUserID == "" {
		v1.HandleError(c, http.StatusBadRequest, errors.New("user id is required"), nil)
		return
	}

	if err := h.svc.RemoveMember(c.Request.Context(), orgID, targetUserID); err != nil {
		v1.HandleError(c, http.StatusBadGateway, err, nil)
		return
	}

	v1.HandleSuccess(c, nil)
}

func toInvitationResp(inv *service.OrganizationInvitation) v1.OrganizationInvitationResp {
	if inv == nil {
		return v1.OrganizationInvitationResp{}
	}
	return v1.OrganizationInvitationResp{
		ID:                  inv.ID,
		InviterID:           inv.InviterID,
		Invitee:             inv.Invitee,
		OrganizationID:      inv.OrganizationID,
		Status:              inv.Status,
		CreatedAt:           formatInvitationTime(inv.CreatedAt),
		ExpiresAt:           formatInvitationTime(inv.ExpiresAt),
		IsExpired:           inv.ExpiresAt > 0 && inv.ExpiresAt <= time.Now().UnixMilli(),
		OrganizationRoleIDs: inv.OrganizationRoleIDs,
	}
}

func formatInvitationTime(timestamp int64) string {
	if timestamp <= 0 {
		return ""
	}
	// Use an explicit timezone so display is independent of the server timezone.
	return carbon.CreateFromTimestampMilli(timestamp, "Asia/Shanghai").ToDateTimeString()
}

func toInvitationRespList(invs []service.OrganizationInvitation) []v1.OrganizationInvitationResp {
	res := make([]v1.OrganizationInvitationResp, len(invs))
	for i, inv := range invs {
		res[i] = toInvitationResp(&inv)
	}
	return res
}

func toMemberRespList(users []service.OrganizationMember) []v1.OrganizationMemberResp {
	res := make([]v1.OrganizationMemberResp, len(users))
	for i, u := range users {
		res[i] = v1.OrganizationMemberResp{
			ID:           u.ID,
			Username:     u.Username,
			PrimaryEmail: u.PrimaryEmail,
			PrimaryPhone: u.PrimaryPhone,
			Name:         u.Name,
			Avatar:       u.Avatar,
			CreatedAt:    u.CreatedAt,
		}
	}
	return res
}
