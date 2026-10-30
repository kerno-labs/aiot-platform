package v1

type CreateOrganizationReq struct {
	Name string `json:"name" binding:"required,max=100" example:"Acme"`
}

type CreateOrganizationInvitationReq struct {
	Invitee string `json:"invitee" binding:"required,email" example:"user@example.com"`
}

type ListOrganizationMembersRequest struct {
	PageRequest
	Query string `form:"q"`
}

type OrganizationInvitationResp struct {
	ID                  string   `json:"id" example:"inv-123"`
	InviterID           string   `json:"inviterId" example:"user-abc"`
	Invitee             string   `json:"invitee" example:"user@example.com"`
	OrganizationID      string   `json:"organizationId" example:"org-123"`
	Status              string   `json:"status" example:"Pending"`
	CreatedAt           string   `json:"createdAt" example:"2026-10-10 10:50:28"`
	ExpiresAt           string   `json:"expiresAt" example:"2026-10-17 10:50:27"`
	IsExpired           bool     `json:"isExpired" example:"false"`
	OrganizationRoleIDs []string `json:"organizationRoleIds,omitempty"`
}

type OrganizationMemberResp struct {
	ID           string  `json:"id" example:"user-123"`
	Username     *string `json:"username,omitempty" example:"johndoe"`
	PrimaryEmail *string `json:"primaryEmail,omitempty" example:"user@example.com"`
	PrimaryPhone *string `json:"primaryPhone,omitempty" example:"+123456789"`
	Name         *string `json:"name,omitempty" example:"John Doe"`
	Avatar       *string `json:"avatar,omitempty" example:"https://example.com/avatar.png"`
	CreatedAt    int64   `json:"createdAt" example:"1700000000000"`
}

type ListOrganizationInvitationsResp struct {
	Items        []OrganizationInvitationResp `json:"items"`
	Total        int                          `json:"total"`
	PendingCount int                          `json:"pendingCount"`
	Page         int                          `json:"page"`
	PageSize     int                          `json:"pageSize"`
}

type ListOrganizationMembersResp struct {
	Items    []OrganizationMemberResp `json:"items"`
	Page     int                      `json:"page"`
	PageSize int                      `json:"pageSize"`
	HasNext  bool                     `json:"hasNext"`
}
