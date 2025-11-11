# CDI Previewer and External Tool Test Guide

## Overview

This guide covers installation and testing of the DDI-CDI (Data Documentation Initiative - Cross Domain Integration) ecosystem for Dataverse. The system consists of three components:

**1. CDI Exporter (Optional)** - Exports or auto-generates DDI-CDI JSON-LD metadata for datasets. Provides OAI-PMH harvestable metadata.

**2. CDI Previewer (Required)** - View and edit DDI-CDI files using SHACL-based forms. Changes save directly back to Dataverse.

**3. Test Upload Tool (Optional)** - Quick way to add example CDI files for testing. Not for production use.

---

## Quick Start

### Option 1: Using rdm-integration (Easiest for Testing)

If you want a complete local Dataverse test environment with CDI support:

```bash
# Clone the rdm-integration repository
git clone https://github.com/libis/rdm-integration.git
cd rdm-integration

# Start Dataverse (this will initialize everything)
make up

# Install CDI support
make add-cdi-support
```

This sets up a complete local Dataverse instance at `http://localhost:8080` with CDI previewer, test upload tool, and CORS pre-configured. You can then create a dataset and test the CDI functionality immediately.

See the [rdm-integration repository](https://github.com/libis/rdm-integration) for more details about the local development environment.

### Option 2: Manual Installation on Existing Dataverse

Complete installation with copy-paste commands:

#### Set Environment Variables

```bash
export SERVER_URL=https://your-dataverse-instance.org
export API_TOKEN=your-api-token-here
export DATASET_PID=doi:10.xxxxx/xxxxx
export EXPORTERS_DIR=/usr/local/dataverse/exporters
```

#### Install CDI Exporter (Optional)

```bash
# Configure exporter directory
sudo mkdir -p $EXPORTERS_DIR
sudo chown dataverse:dataverse $EXPORTERS_DIR
curl -X PUT -d "$EXPORTERS_DIR" \
  "$SERVER_URL/api/admin/settings/:dataverse-spi-exporters-directory"

cd $EXPORTERS_DIR

# Download exporter-transformer JAR (skip if already present)
wget -O exporter-transformer-1.0.10-jar-with-dependencies.jar \
  https://repo1.maven.org/maven2/io/gdcc/export/exporter-transformer/1.0.10/exporter-transformer-1.0.10-jar-with-dependencies.jar

# Install CDI exporter
mkdir -p cdi-exporter
wget -O cdi-exporter/config.json \
  https://raw.githubusercontent.com/gdcc/exporter-transformer/main/examples/cdi-exporter/config.json
wget -O cdi-exporter/transformer.py \
  https://raw.githubusercontent.com/gdcc/exporter-transformer/main/examples/cdi-exporter/transformer.py
```

#### Install CDI Previewer (Required)

**For Dataverse 6.1+ (Recommended):**

```bash
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
  "contentType":"application/ld+json; profile=\"http://www.w3.org/ns/json-ld#flattened http://www.w3.org/ns/json-ld#compacted https://ddialliance.org/Specification/DDI-CDI/1.0\"",
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

**For Dataverse 5.2-6.0:**

```bash
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
  "contentType":"application/ld+json; profile=\"http://www.w3.org/ns/json-ld#flattened http://www.w3.org/ns/json-ld#compacted https://ddialliance.org/Specification/DDI-CDI/1.0\""
}'
```

#### Install Test Upload Tool (Optional)

```bash
curl -X POST -H 'Content-type: application/json' \
  -H "X-Dataverse-key:$API_TOKEN" \
  "$SERVER_URL/api/admin/externalTools" \
  -d '{
  "displayName": "Add CDI Test Files",
  "description": "Testing tool: Add example DDI-CDI files to this dataset.",
  "toolName": "cdiTestUploadTool",
  "scope": "dataset",
  "types": ["configure"],
  "toolUrl": "https://erykkul.github.io/dataverse-previewers/examples/cdi/cdi-upload-tool.html",
  "toolParameters": {
    "queryParameters": [
      {"datasetid": "{datasetId}"},
      {"datasetversion": "{datasetVersion}"},
      {"siteUrl": "{siteUrl}"}
    ]
  }
}'
```

#### Configure CORS

```bash
curl -X PUT -d 'https://erykkul.github.io' \
  "$SERVER_URL/api/admin/settings/:CorsAllowedOrigins"
```

#### Restart and Verify

```bash
# Restart Dataverse
sudo systemctl restart dataverse

# Verify external tools installed
curl "$SERVER_URL/api/admin/externalTools"

# Test CDI export (if exporter installed)
curl "$SERVER_URL/api/datasets/export?exporter=cdi&persistentId=$DATASET_PID" \
  -o test-export.jsonld
```

#### Test with Example File

```bash
# Download and upload an example
curl -O https://erykkul.github.io/dataverse-previewers/examples/cdi/SimpleSample.jsonld

curl -H "X-Dataverse-key:$API_TOKEN" -X POST \
  -F 'file=@SimpleSample.jsonld' \
  -F 'jsonData={"description":"CDI Sample Metadata","categories":["Data"],"mimeType":"application/ld+json; profile=\"http://www.w3.org/ns/json-ld#flattened http://www.w3.org/ns/json-ld#compacted https://ddialliance.org/Specification/DDI-CDI/1.0\""}' \
  "$SERVER_URL/api/datasets/:persistentId/add?persistentId=$DATASET_PID"
```

Go to your dataset page and click the preview icon on the uploaded file.

---

## MIME Type Specification

DDI-CDI files require a specific MIME type to distinguish them from generic JSON-LD:

```
application/ld+json; profile="http://www.w3.org/ns/json-ld#flattened http://www.w3.org/ns/json-ld#compacted https://ddialliance.org/Specification/DDI-CDI/1.0"
```

**Profile components:**
- `flattened` - Uses `@graph` structure
- `compacted` - Compact IRI representation  
- DDI-CDI specification URI - Version 1.0

This profile parameter is **required** when uploading CDI files so Dataverse can identify them correctly.

---

## Prerequisites

- Dataverse 5.2+ (5.13+ recommended for signed URLs)
- Administrator access
- API token (Account → API Token)
- Test dataset with persistent ID (DOI/Handle)

---

## Using the CDI Exporter

The CDI Exporter provides two modes:

1. **Export existing CDI file** - Returns the most recent `.jsonld` file with CDI MIME type from the dataset
2. **Generate from metadata** - Creates DDI-CDI JSON-LD from Dataverse metadata if no CDI file exists

**Export via API:**
```bash
curl "$SERVER_URL/api/datasets/export?exporter=cdi&persistentId=$DATASET_PID" -o dataset.jsonld
```

**Export via Web Interface:**
Dataset page → Export → "DDI-CDI (Cross Domain Integration)"

---

## Using the CDI Previewer

**Accessing the Preview:**
1. Upload a CDI file with the correct MIME type
2. Click the preview icon next to the file in your dataset

**View Mode (Default):**
- Displays metadata using SHACL-based structured forms
- Expandable/collapsible sections organized by metadata blocks
- Read-only display

**Edit Mode:**
1. Enter your API token in the field at the top
2. Click "Enable Editing"
3. Modify any field (validated against SHACL shapes)
4. Click "Save Changes" to update the file in Dataverse

**Requirements for Editing:**
- Valid API token with write permissions
- Dataset must be in draft state
- User must have edit rights

---

## Example Files

Five example CDI files are available for testing:

1. **SimpleSample.jsonld** - Basic sample with variables
2. **SimpleSample2.jsonld** - Sample with status codes
3. **se_na2so4-XDI-CDI-CDIF.jsonld** - X-ray absorption spectroscopy
4. **FeXAS_Fe_c3d.001-NEXUS-HDF5-cdi-CDIF.jsonld** - Iron XAS NEXUS/HDF5
5. **ESS11-subset_DDICDI.jsonld** - European Social Survey

**Download:**
```bash
curl -O https://erykkul.github.io/dataverse-previewers/examples/cdi/[filename].jsonld
```

**Upload via API:**
```bash
curl -H "X-Dataverse-key:$API_TOKEN" -X POST \
  -F 'file=@SimpleSample.jsonld' \
  -F 'jsonData={"description":"CDI metadata","categories":["Data"],"mimeType":"application/ld+json; profile=\"http://www.w3.org/ns/json-ld#flattened http://www.w3.org/ns/json-ld#compacted https://ddialliance.org/Specification/DDI-CDI/1.0\""}' \
  "$SERVER_URL/api/datasets/:persistentId/add?persistentId=$DATASET_PID"
```

**Upload via Web Interface:**
1. Upload file normally
2. Edit file metadata
3. Set MIME Type to CDI profile (see above)

**Or use the Test Upload Tool:**
Edit Dataset → Add CDI Test Files → Select file → Upload

---

## Troubleshooting

**Previewer doesn't appear:**
- Verify MIME type includes full CDI profile (not just `application/ld+json`)
- Check external tool installed: `curl $SERVER_URL/api/admin/externalTools`
- Ensure file is saved, not just uploaded

**CORS errors:**
```bash
curl -X PUT -d 'https://erykkul.github.io' \
  "$SERVER_URL/api/admin/settings/:CorsAllowedOrigins"
```

**SHACL shapes not loading:**
- Check network connectivity
- Verify: https://erykkul.github.io/dataverse-previewers/previewers/betatest/shapes/CDIF-Discovery-Core-Shapes.ttl
- Check browser console for errors

**Save fails:**
- Verify API token is valid and not expired
- Check edit permissions on dataset
- Dataset must be in draft state
- Check browser network tab for API error details

**Invalid JSON-LD error:**
- Validate JSON syntax
- Ensure `@context` is present
- Check against DDI-CDI specification

---

## Quick Reference

**List external tools:**
```bash
curl "$SERVER_URL/api/admin/externalTools"
```

**Remove external tool:**
```bash
curl -X DELETE -H "X-Dataverse-key:$API_TOKEN" \
  "$SERVER_URL/api/admin/externalTools/$TOOL_ID"
```

**Check/update file MIME type:**
```bash
# Check
curl "$SERVER_URL/api/files/$FILE_ID/metadata"

# Update
curl -H "X-Dataverse-key:$API_TOKEN" -X POST \
  -F 'jsonData={"mimeType":"application/ld+json; profile=\"http://www.w3.org/ns/json-ld#flattened http://www.w3.org/ns/json-ld#compacted https://ddialliance.org/Specification/DDI-CDI/1.0\""}' \
  "$SERVER_URL/api/files/$FILE_ID/metadata"
```

**Export dataset as CDI:**
```bash
curl "$SERVER_URL/api/datasets/export?exporter=cdi&persistentId=$DATASET_PID" -o dataset.jsonld
```

---

## Resources

- DDI-CDI: https://ddialliance.org/Specification/DDI-CDI/
- SHACL Shapes: https://github.com/Cross-Domain-Interoperability-Framework/validation
- Dataverse External Tools: https://guides.dataverse.org/en/latest/api/external-tools.html
- Exporter Transformer: https://github.com/gdcc/exporter-transformer
- Example Files: https://erykkul.github.io/dataverse-previewers/examples/cdi/

---

**Version:** 1.0 (beta) | **DDI-CDI:** 1.0-rc1 | **Dataverse:** 5.2+ (6.1+ recommended)
