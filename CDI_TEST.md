# CDI Previewer and External Tool Test Guide

## Overview

This guide provides complete instructions for testing the DDI-CDI (Data Documentation Initiative - Cross Domain Integration) previewer and external tool with a Dataverse installation. The CDI previewer provides standards-compliant viewing and editing of DDI-CDI metadata files using official SHACL shapes.

## Table of Contents

1. [About DDI-CDI](#about-ddi-cdi)
2. [MIME Type Specification](#mime-type-specification)
3. [Installation Prerequisites](#installation-prerequisites)
4. [Installing the CDI Previewer](#installing-the-cdi-previewer)
5. [Installing the CDI Upload Tool](#installing-the-cdi-upload-tool)
6. [Testing with Example Files](#testing-with-example-files)
7. [Using the Previewer](#using-the-previewer)
8. [Editing CDI Files](#editing-cdi-files)
9. [Troubleshooting](#troubleshooting)

---

## About DDI-CDI

DDI-CDI (Data Documentation Initiative - Cross Domain Integration) is a specification for documenting research data across different domains. It uses JSON-LD format and provides a standardized way to describe datasets, variables, and their relationships.

**Key Features:**
- Cross-domain data documentation
- JSON-LD format with RDF semantics
- SHACL-based validation and rendering
- Support for complex data structures

**Official Resources:**
- DDI Alliance: https://ddialliance.org/
- SHACL Shapes: https://github.com/Cross-Domain-Interoperability-Framework/validation

---

## MIME Type Specification

### Current Status

The MIME type for DDI-CDI JSON-LD files is **under discussion** by the DDI-CDI working group. The exact profile URI has not been finalized yet.

### Proposed MIME Type

```
application/ld+json; profile="http://www.w3.org/ns/json-ld#flattened http://www.w3.org/ns/json-ld#compacted https://ddialliance.org/Specification/DDI-CDI/1.0"
```

### Current Implementation

For testing purposes, the previewer currently accepts:

**Option 1: Generic JSON-LD**
```
application/ld+json
```

**Option 2: With Profile (when finalized)**
```
application/ld+json; profile="http://www.w3.org/ns/json-ld#flattened http://www.w3.org/ns/json-ld#compacted https://ddialliance.org/Specification/DDI-CDI/1.0"
```

### MIME Type Components

- **Base type**: `application/ld+json` - Standard JSON-LD MIME type
- **Profile parameters**:
  - `http://www.w3.org/ns/json-ld#flattened` - Indicates flattened JSON-LD structure (with `@graph`)
  - `http://www.w3.org/ns/json-ld#compacted` - Indicates compact IRI representation
  - `https://ddialliance.org/Specification/DDI-CDI/1.0` - DDI-CDI specification URI

### Setting MIME Type in Dataverse

When uploading CDI files to Dataverse, you may need to set the MIME type manually if it's not detected automatically:

**Via Web Interface:**
1. Upload the file
2. Go to File → Edit Files → File Metadata
3. Set MIME Type to `application/ld+json`

**Via API:**
```bash
curl -H "X-Dataverse-key:$API_TOKEN" -X POST \
  -F 'file=@SimpleSample.jsonld' \
  -F 'jsonData={"description":"CDI metadata file","categories":["Data"],"mimeType":"application/ld+json"}' \
  "$SERVER_URL/api/datasets/:persistentId/add?persistentId=$DATASET_PID"
```

---

## Installation Prerequisites

Before installing the CDI tools, ensure you have:

1. **Dataverse Installation**
   - Dataverse 5.13+ (for signed URLs support, recommended)
   - Dataverse 5.2+ (minimum, uses API tokens)
   - Administrator access to install external tools

2. **API Token**
   - Create an API token in your Dataverse account
   - Found under: Account → API Token

3. **Test Dataset**
   - Create or identify a dataset for testing
   - Note the dataset's persistent identifier (DOI or Handle)

---

## Installing the CDI Previewer

The CDI Previewer allows users to view and edit DDI-CDI metadata files directly in Dataverse using official SHACL shapes from the Cross-Domain Interoperability Framework.

### For Dataverse 6.1+ (Using Signed URLs - Recommended)

```bash
export SERVER_URL=https://your-dataverse-instance.org
export API_TOKEN=your-api-token-here

curl -X POST -H 'Content-type: application/json' \
  -H "X-Dataverse-key:$API_TOKEN" \
  "$SERVER_URL/api/admin/externalTools" \
  -d '{
  "displayName":"View CDI Metadata",
  "description":"View and edit DDI Cross-Domain Integration (CDI) metadata file using SHACL shapes.",
  "toolName":"cdiPreviewer",
  "scope":"file",
  "types":["preview", "explore"],
  "toolUrl":"https://erykkul.github.io/dataverse-previewers/previewers/betatest/CdiPreview.html",
  "toolParameters": {
      "queryParameters":[
        {"fileid":"{fileId}"},
        {"siteUrl":"{siteUrl}"},
        {"datasetid":"{datasetId}"},
        {"datasetversion":"{datasetVersion}"},
        {"locale":"{localeCode}"}
      ]
    },
  "contentType":"application/ld+json",
  "allowedApiCalls": [
    {
      "name": "retrieveFileContents",
      "httpMethod": "GET",
      "urlTemplate": "/api/v1/access/datafile/{fileId}?gbrecs=true",
      "timeOut": 3600
    },
    {
      "name": "downloadFile",
      "httpMethod": "GET",
      "urlTemplate": "/api/v1/access/datafile/{fileId}?gbrecs=false",
      "timeOut": 3600
    },
    {
      "name": "getDatasetVersionMetadata",
      "httpMethod": "GET",
      "urlTemplate": "/api/v1/datasets/{datasetId}/versions/{datasetVersion}",
      "timeOut": 3600
    },
    {
      "name": "replaceFile",
      "httpMethod": "POST",
      "urlTemplate": "/api/files/{fileId}/replace",
      "timeOut": 3600
    }
  ]
}'
```

### For Dataverse 5.2-6.0 (Using API Tokens)

```bash
export SERVER_URL=https://your-dataverse-instance.org
export API_TOKEN=your-api-token-here

curl -X POST -H 'Content-type: application/json' \
  -H "X-Dataverse-key:$API_TOKEN" \
  "$SERVER_URL/api/admin/externalTools" \
  -d '{
  "displayName":"View CDI Metadata",
  "description":"View and edit DDI Cross-Domain Integration (CDI) metadata file using SHACL shapes.",
  "toolName":"cdiPreviewer",
  "scope":"file",
  "types":["preview", "explore"],
  "toolUrl":"https://erykkul.github.io/dataverse-previewers/previewers/betatest/CdiPreview.html",
  "toolParameters": {
      "queryParameters":[
        {"fileid":"{fileId}"},
        {"siteUrl":"{siteUrl}"},
        {"key":"{apiToken}"},
        {"datasetid":"{datasetId}"},
        {"datasetversion":"{datasetVersion}"},
        {"locale":"{localeCode}"}
      ]
    },
  "contentType":"application/ld+json"
}'
```

### Verify Installation

```bash
curl "$SERVER_URL/api/admin/externalTools"
```

You should see the CDI previewer listed with its configuration.

---

## Installing the CDI Test Upload Tool (Optional)

The CDI Test Upload Tool is a **simplified testing tool** that lets you quickly add example CDI files to a dataset for testing the previewer. 

**Important Notes:**
- This is NOT a production-ready upload tool
- It only provides access to the five example CDI files included in the repository
- For production use, users should upload CDI files through the standard Dataverse interface or create a proper external tool
- This tool is useful for quickly testing the previewer without manually downloading and uploading files

### Create the External Tool Manifest

Save the following as `cdi-upload-tool.json`:

```json
{
  "displayName": "Add CDI Test Files",
  "description": "Testing tool: Add example DDI-CDI files to this dataset. This is a simplified tool for testing the CDI previewer - not for production use.",
  "toolName": "cdiUploadTool",
  "scope": "dataset",
  "types": ["configure"],
  "toolUrl": "https://erykkul.github.io/dataverse-previewers/examples/cdi/cdi-upload-tool.html",
  "toolParameters": {
    "queryParameters": [
      {
        "datasetid": "{datasetId}"
      },
      {
        "datasetversion": "{datasetVersion}"
      },
      {
        "siteUrl": "{siteUrl}"
      }
    ]
  }
}
```

### Install the Tool

```bash
export SERVER_URL=https://your-dataverse-instance.org
export API_TOKEN=your-api-token-here

curl -X POST -H 'Content-type: application/json' \
  -H "X-Dataverse-key:$API_TOKEN" \
  "$SERVER_URL/api/admin/externalTools" \
  --upload-file cdi-upload-tool.json
```

### Using the Test Upload Tool

1. Navigate to a dataset in your Dataverse
2. Click **"Edit Dataset"** → **"Add CDI Test Files"** (or similar, based on displayName)
3. Select one of the five example files:
   - **SimpleSample.jsonld** - Basic sample dataset
   - **SimpleSample2.jsonld** - Sample with status codes
   - **se_na2so4-XDI-CDI-CDIF.jsonld** - X-ray absorption spectroscopy
   - **FeXAS_Fe_c3d.001-NEXUS-HDF5-cdi-CDIF.jsonld** - Iron XAS NEXUS/HDF5
   - **ESS11-subset_DDICDI.jsonld** - European Social Survey data
4. Enter your API token
5. Click **"Upload Selected File to Dataset"**
6. File is automatically downloaded from GitHub Pages and uploaded to your dataset with correct MIME type

---

## Testing with Example Files

### Available Example Files

The repository includes five example CDI files you can use for testing:

1. **SimpleSample.jsonld** - Basic sample dataset with variables
   - Sample ID, Mass, Volume, Measurement Date
   - Simple structure for initial testing

2. **SimpleSample2.jsonld** - Sample with status codes
   - Additional complexity with categorical data
   
3. **se_na2so4-XDI-CDI-CDIF.jsonld** - X-ray absorption spectroscopy data
   - XAS scientific data example
   - Complex structure with multiple components

4. **FeXAS_Fe_c3d.001-NEXUS-HDF5-cdi-CDIF.jsonld** - Iron XAS data
   - NEXUS/HDF5 format integration
   - Advanced scientific dataset

5. **ESS11-subset_DDICDI.jsonld** - European Social Survey subset
   - Social science survey data
   - Demonstrates CDI for survey research

### Download Example Files

```bash
# Download all example files
curl -O https://erykkul.github.io/dataverse-previewers/examples/cdi/SimpleSample.jsonld
curl -O https://erykkul.github.io/dataverse-previewers/examples/cdi/SimpleSample2.jsonld
curl -O https://erykkul.github.io/dataverse-previewers/examples/cdi/se_na2so4-XDI-CDI-CDIF.jsonld
curl -O https://erykkul.github.io/dataverse-previewers/examples/cdi/FeXAS_Fe_c3d.001-NEXUS-HDF5-cdi-CDIF.jsonld
curl -O https://erykkul.github.io/dataverse-previewers/examples/cdi/ESS11-subset_DDICDI.jsonld
```

### Upload via API

```bash
export SERVER_URL=https://your-dataverse-instance.org
export API_TOKEN=your-api-token-here
export DATASET_PID=doi:10.xxxxx/xxxxx

# Upload SimpleSample.jsonld
curl -H "X-Dataverse-key:$API_TOKEN" -X POST \
  -F 'file=@SimpleSample.jsonld' \
  -F 'jsonData={"description":"CDI Sample Dataset Metadata","categories":["Data"],"mimeType":"application/ld+json"}' \
  "$SERVER_URL/api/datasets/:persistentId/add?persistentId=$DATASET_PID"
```

### Upload via Web Interface

1. Go to your dataset page
2. Click **"Edit Dataset"** → **"Files (Upload)"**
3. Drag and drop the `.jsonld` file
4. Add description: "CDI metadata file"
5. Save changes
6. After upload, edit the file metadata:
   - Go to the file page
   - Click **"Edit Files"** → **"File Metadata"**
   - Set MIME Type: `application/ld+json`
   - Save

**Tip:** If you installed the optional test upload tool, you can use **"Edit Dataset"** → **"Add CDI Test Files"** to quickly add example files without manual download.

---

## Using the Previewer

### Access the Preview

Once a CDI file is uploaded with the correct MIME type:

1. **From Dataset Page:**
   - Look for the preview icon next to the file
   - Click the icon to open the preview

2. **From File Page:**
   - Navigate to the file page
   - The preview appears in the "Preview" or "File Tools" tab
   - Preview loads automatically after guestbook (if any)

### Previewer Features

**View Mode (Default):**
- Displays CDI metadata in structured form
- Uses official SHACL shapes from CDIF
- Organized by metadata blocks
- Expandable/collapsible sections
- Read-only display

**Information Displayed:**
- Dataset information (name, description)
- Data structure details
- Variable definitions
- Value domains and data types
- Physical layout information
- All properties defined in SHACL shapes

---

## Editing CDI Files

The CDI previewer includes editing capabilities that allow users to modify metadata and save changes back to Dataverse.

### Enable Edit Mode

1. **Open the previewer** for a CDI file
2. **Enter your API token** in the field at the top
   - Get your API token from: Account → API Token → Create Token
3. **Click "Enable Editing"** button
   - Button changes to "View Mode" (orange)
   - Save button appears
   - Form fields become editable

### Make Changes

- Edit any field displayed in the form
- Changes are validated against SHACL shapes
- Invalid data is highlighted with error messages
- Required fields must be filled

### Save Changes

1. **Click "Save Changes"** button
2. System will:
   - Serialize the form data back to JSON-LD
   - Call Dataverse API to replace the file
   - Show success/error status
   - Return to view mode on success

### API Call Details

The save operation uses the Dataverse file replacement API:

```
POST /api/files/{fileId}/replace
```

**Requirements:**
- Valid API token with write permissions
- File must be in a draft dataset version
- User must have edit rights on the dataset

**What Gets Updated:**
- File content (JSON-LD data)
- File metadata preserved (description, tags, etc.)

---

## Troubleshooting

### Previewer Doesn't Appear

**Problem:** Preview icon doesn't show up for CDI files

**Solutions:**
1. Check MIME type is set to `application/ld+json`
2. Verify external tool is installed: `curl $SERVER_URL/api/admin/externalTools`
3. Check browser console for errors
4. Ensure file has been saved (not just uploaded)

### CORS Errors

**Problem:** Browser blocks API requests with CORS error

**Solutions:**
1. Add GitHub Pages to CORS allowed origins:
   ```bash
   curl -X PUT -d 'https://erykkul.github.io' \
     "$SERVER_URL/api/admin/settings/:CorsAllowedOrigins"
   ```
2. For wildcard (testing only):
   ```bash
   curl -X PUT -d '*' \
     "$SERVER_URL/api/admin/settings/:CorsAllowedOrigins"
   ```

### SHACL Shapes Not Loading

**Problem:** Error message "Failed to load SHACL shapes"

**Solutions:**
1. Check network connectivity
2. Verify shapes file is accessible at:
   `https://erykkul.github.io/dataverse-previewers/previewers/betatest/shapes/CDIF-Discovery-Core-Shapes.ttl`
3. Check browser console for specific error
4. Try refreshing the page

### Save Fails

**Problem:** "Failed to save" error when clicking Save Changes

**Solutions:**
1. Verify API token is correct and not expired
2. Check user has edit permissions on dataset
3. Ensure dataset is in draft state (not published)
4. Check network tab in browser for specific API error
5. Verify file ID is being passed correctly

### Invalid JSON-LD

**Problem:** "Invalid JSON-LD format" error on preview

**Solutions:**
1. Validate JSON syntax using a JSON validator
2. Ensure `@context` is present and valid
3. Check for required DDI-CDI fields
4. Verify against DDI-CDI specification

### Test Upload Tool Not Available

**Problem:** "Add CDI Test Files" option not in Edit Dataset menu

**Solutions:**
1. Verify external tool is installed for dataset scope
2. Check user has edit permissions
3. Ensure tool type is set to "configure"
4. Refresh the dataset page

**Note:** This tool is optional and only for testing. You can upload CDI files through the standard Dataverse interface instead.

---

## Additional Resources

### Documentation
- DDI-CDI Specification: https://ddialliance.org/Specification/DDI-CDI/
- SHACL Shapes: https://github.com/Cross-Domain-Interoperability-Framework/validation
- shacl-form Library: https://github.com/ULB-Darmstadt/shacl-form
- Dataverse External Tools API: https://guides.dataverse.org/en/latest/api/external-tools.html

### Example Files Location
- GitHub Repository: https://github.com/ErykKul/dataverse-previewers
- Direct Access: https://erykkul.github.io/dataverse-previewers/examples/cdi/

### Getting Help
- Dataverse Community: https://groups.google.com/forum/#!forum/dataverse-community
- DDI Alliance: https://ddialliance.org/contact
- GitHub Issues: https://github.com/ErykKul/dataverse-previewers/issues

---

## Quick Reference Commands

### List All External Tools
```bash
curl "$SERVER_URL/api/admin/externalTools"
```

### Remove an External Tool
```bash
curl -X DELETE -H "X-Dataverse-key:$API_TOKEN" \
  "$SERVER_URL/api/admin/externalTools/$TOOL_ID"
```

### Check File MIME Type
```bash
curl "$SERVER_URL/api/files/$FILE_ID/metadata"
```

### Update File MIME Type
```bash
curl -H "X-Dataverse-key:$API_TOKEN" -X POST \
  -F 'jsonData={"mimeType":"application/ld+json"}' \
  "$SERVER_URL/api/files/$FILE_ID/metadata"
```

---

## Version Information

- **Previewer Version:** 1.0 (beta)
- **DDI-CDI Version:** 1.0-rc1
- **SHACL Shapes:** CDIF-Discovery-Core-Shapes.ttl
- **Minimum Dataverse:** 5.2+
- **Recommended Dataverse:** 6.1+

---

Last Updated: November 2025
