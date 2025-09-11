# Data Governance Classification Criteria

## Overview
This document defines the classification criteria for identifying Jira tickets that require data governance council review. Analyze each ticket against these categories and flag any that match one or more criteria.

## Classification Categories

### 1. Data Privacy and Security
- Personal Identifiable Information (PII) handling or exposure
- GDPR, CCPA, or other privacy regulation compliance issues
- Data breach incidents or potential vulnerabilities
- Encryption requirements or issues
- Authentication and authorization changes
- Data anonymization or pseudonymization requests

### 2. Data Quality and Integrity
- Data validation rule changes
- Data cleansing requirements
- Duplicate data issues
- Data accuracy concerns
- Missing or incomplete data problems
- Data consistency issues across systems

### 3. Data Access Control
- User permission changes for sensitive data
- Role-based access control (RBAC) modifications
- Data sharing agreements or requests
- Third-party data access requirements
- API access to sensitive data
- Database access privilege changes

### 4. Compliance and Regulatory
- Regulatory reporting requirements
- Audit trail implementations
- Data retention policy changes
- Legal hold requirements
- Industry-specific compliance (HIPAA, SOX, etc.)
- Cross-border data transfer issues

### 5. Data Architecture and Integration
- System integration involving sensitive data
- Data pipeline modifications
- ETL process changes affecting critical data
- Database schema changes
- Data migration projects
- Master data management implementations

### 6. Data Lifecycle Management
- Data retention period modifications
- Data archival processes
- Data disposal or deletion requests
- Backup and recovery procedure changes
- Data versioning requirements

### 7. Data Classification and Sensitivity
- Changes to data classification levels
- Handling of confidential or restricted data
- Public data exposure risks
- Intellectual property data management
- Financial data handling

### 8. Reporting and Analytics
- New reporting requirements on sensitive data
- Business intelligence implementations
- Data warehouse modifications
- Analytics platform access changes
- KPI or metric definition changes affecting governance

## Decision Criteria
Flag a ticket for governance review if it:
- Involves any of the categories above
- Has potential regulatory or compliance implications
- Could affect data security or privacy
- Involves changes to how data is collected, stored, processed, or shared
- Requires decisions about data ownership or stewardship
- Has cross-departmental data implications

## Examples of Tickets to Flag

1. "Need to implement GDPR-compliant data deletion process"
2. "Request to share customer database with third-party vendor"
3. "Database migration from on-premise to cloud"
4. "Implement new data quality checks for financial reporting"
5. "Add audit logging for sensitive data access"
6. "Change data retention from 7 years to 3 years"
7. "New API endpoint exposing user profile information"
8. "Merge duplicate customer records across systems"

## Examples of Tickets NOT to Flag

1. "Password reset request"
2. "Fix typo in user interface"
3. "Update application logo"
4. "Increase server memory allocation"
5. "Fix broken hyperlink on website"
6. "Schedule routine maintenance window"
7. "Update software library version"
8. "Add new color theme to application"