package custom_types

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
)

// AwsCredentials represents AWS credentials in a structured format
type AwsCredentials struct {
	AccessKeyID     string `json:"aws_access_key_id"`
	SecretAccessKey string `json:"aws_secret_access_key"`
}

// Value implements the driver.Valuer interface
func (a AwsCredentials) Value() (driver.Value, error) {
	return json.Marshal(a)
}

// Scan implements the sql.Scanner interface
func (a *AwsCredentials) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(b, &a)
}

// CloudflareCredentials represents Cloudflare credentials in a structured format
type CloudflareCredentials struct {
	AccessKeyID     string `json:"cloudflare_access_key_id"`
	SecretAccessKey string `json:"cloudflare_secret_access_key"`
}

// Value implements the driver.Valuer interface
func (c CloudflareCredentials) Value() (driver.Value, error) {
	return json.Marshal(c)
}

// Scan implements the sql.Scanner interface
func (c *CloudflareCredentials) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(b, &c)
}

// For convenience, let's add constructors

// NewAwsCredentials creates a new AWS credentials object
func NewAwsCredentials(accessKeyID, secretAccessKey string) AwsCredentials {
	return AwsCredentials{
		AccessKeyID:     accessKeyID,
		SecretAccessKey: secretAccessKey,
	}
}

// NewCloudflareCredentials creates a new Cloudflare credentials object
func NewCloudflareCredentials(accessKeyID, secretAccessKey string) CloudflareCredentials {
	return CloudflareCredentials{
		AccessKeyID:     accessKeyID,
		SecretAccessKey: secretAccessKey,
	}
}
