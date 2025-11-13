# DDI-CDI Integration in Dataverse: Workshop Report

## Executive Summary

This document reports on the successful implementation of DDI-CDI (Cross Domain Integration) support in Dataverse through two complementary components: a metadata exporter and an interactive previewer/editor. Both implementations follow Dataverse's plugin architecture, ensuring they remain non-intrusive to the core codebase and can be deployed to any Dataverse instance without modifications.

**Key achievements:**
- ✅ CDI metadata export with automatic fallback generation
- ✅ Interactive CDI file previewer with visualization
- ✅ Full-featured CDI metadata editor with SHACL validation
- ✅ Multiple pathways for CDI file generation and integration
- ✅ Standards-compliant MIME type handling

All code is being contributed to the Global Dataverse Community Consortium (GDCC) repositories:
- Exporter: [gdcc/exporter-transformer](https://github.com/gdcc/exporter-transformer/)
- Previewer: [gdcc/dataverse-previewers](https://github.com/gdcc/dataverse-previewers) (PR pending)

---

## Architecture Overview

The DDI-CDI integration follows a layered approach, depicted in the architecture diagram below:

![CDI Integration Architecture](attachment)

### Bottom-Up Workflow

```
Published Dataset → Exporter → Previewer/Editor → File Management → Orchestrated Tools
```

---

## Component 1: DDI-CDI Metadata Exporter

**Repository:** [gdcc/exporter-transformer](https://github.com/gdcc/exporter-transformer/)  
**Location:** `examples/cdi-exporter/`

### Purpose

The CDI exporter adds basic DDI-CDI export support to Dataverse, enabling datasets to be exported in the DDI-CDI format. This component implements intelligent metadata handling with automatic fallback generation.

### Key Features

#### 1. **Intelligent File Detection**
When a dataset is exported:
1. **Primary behavior**: Check if a CDI file exists in the dataset
2. **Fallback behavior**: If no CDI file is present, automatically generate basic CDI metadata from available Dataverse metadata

The exporter searches for files with the **exact MIME type**:
```
application/ld+json;profile="http://www.w3.org/ns/json-ld#flattened http://www.w3.org/ns/json-ld#compacted https://ddialliance.org/specification/ddi-cdi/1.0"
```

⚠️ **CRITICAL**: The MIME type must be exact (including the `profile` parameter) for the exporter to recognize CDI files.

#### 2. **Enhanced Metadata Mapping**
When generating CDI metadata as fallback, the exporter leverages:
- Dataset-level metadata (title, description, authors, etc.)
- **Variable-level metadata** (when Dataverse ingest is enabled)
- DDI Codebook exports (for supported file formats)
- File-level descriptions and labels

Instances with ingest enabled get significantly richer CDI exports, as variable-level information is included in the generated metadata.

#### 3. **Technical Implementation**
The exporter successfully addresses several technical challenges:
- **Site URL extraction**: Multi-strategy approach with fallbacks for various Dataverse deployment patterns
- **File discovery**: Reads from dataset metadata structure without additional HTTP calls
- **Content download**: Retrieves CDI files directly from Dataverse API
- **Return types**: 
  - Existing CDI files return as `WideDataSet` (26+ nodes)
  - Generated metadata returns as `DataSet` (7 nodes minimum)

### Export Endpoint

```bash
GET /api/datasets/export?exporter=cdi&persistentId=doi:10.5072/FK2/EXAMPLE
```

### Registration

The exporter is registered through Dataverse's exporter API:
```bash
curl -X POST "http://localhost:8080/api/admin/metadata/exporters" \
  -H "Content-Type: application/json" \
  --data @cdi-exporter.json
```

---

## Component 2: DDI-CDI Previewer and Editor

**Repository:** [gdcc/dataverse-previewers](https://github.com/gdcc/dataverse-previewers)  
**Location:** `previewers/betatest/CdiPreview.html`

### Purpose

The CDI previewer provides visualization and editing capabilities for DDI-CDI files within Dataverse. It activates automatically when a file with the correct MIME type is present in a dataset.

### Key Features

#### 1. **MIME Type Matching**
The previewer **requires** the exact MIME type to activate:
```
application/ld+json;profile="http://www.w3.org/ns/json-ld#flattened http://www.w3.org/ns/json-ld#compacted https://ddialliance.org/specification/ddi-cdi/1.0"
```

⚠️ **CRITICAL**: Note that the MIME type uses **no space** after the semicolon (`;profile=` not `; profile=`). This format must be consistent across:
- File upload/replacement operations
- External tool registrations
- Exporter metadata generation

#### 2. **Visualization Mode**
When viewing a CDI file, the previewer displays:
- **JSON-LD graph structure**: All nodes in the `@graph` array
- **Node relationships**: Visual representation of how entities connect
- **Property values**: Formatted display of all metadata fields
- **Type information**: Clear indication of each node's `@type`

#### 3. **Edit Mode**
The editor provides a sophisticated interface for modifying CDI metadata:

**Visual Distinction of Field Types:**
- 🔵 **Blue borders**: SHACL-defined properties (from the CDI specification)
- 🟡 **Yellow borders**: Extra fields (user-added, not in specification)
- 🔴 **Red badges**: Required fields with thick borders
- ⚪ **White badges**: Optional fields

**Field Management:**
- ➕ **Add properties**: Searchable dropdown for SHACL properties
- 🗑️ **Delete values**: Trash icons for array items and optional fields
- 📝 **Type-aware inputs**: Number, date, datetime, URL validation based on `sh:datatype`
- ⚠️ **Required indicators**: Visual warnings for mandatory fields

**Nested Object Support:**
- Dropdown shows `[object]` for complex properties
- Creates new nodes in `@graph` with proper `@id` and `@type`
- Maintains referential integrity across the graph

**Legend and Help:**
- Built-in legend explaining color coding
- Tooltips for SHACL properties
- Clear indication of required vs optional vs extra fields

#### 4. **File Operations**
- **Download**: Export current (edited or original) CDI file
- **Replace**: Save changes back to Dataverse
  - Uses Dataverse API for file replacement
  - Preserves file ID and metadata
  - **Sets correct MIME type** for continued functionality

### Registration

The previewer is registered as an external tool:

```bash
curl -X POST "http://localhost:8080/api/admin/externalTools" \
  -H "Content-Type: application/json" \
  --data @04-cdi-previewer.json
```

**External tool configuration** (`04-cdi-previewer.json`):
```json
{
  "displayName": "View CDI Metadata",
  "description": "Preview and edit DDI-CDI metadata files",
  "toolName": "cdiPreviewer",
  "scope": "file",
  "type": "explore",
  "hasPreviewMode": true,
  "toolUrl": "https://gdcc.github.io/dataverse-previewers/previewers/betatest/CdiPreview.html",
  "contentType": "application/ld+json;profile=\"http://www.w3.org/ns/json-ld#flattened http://www.w3.org/ns/json-ld#compacted https://ddialliance.org/specification/ddi-cdi/1.0\"",
  "toolParameters": {
    "queryParameters": [
      {"fileid": "{fileId}"},
      {"siteUrl": "{siteUrl}"},
      {"key": "{apiToken}"},
      {"datasetid": "{datasetId}"},
      {"datasetversion": "{datasetVersion}"}
    ]
  }
}
```

---

## CDI File Generation Pathways

There are multiple ways to create and add CDI files to datasets, enabling flexible workflows:

### 1. **Generic CDI Generation Tools**

Organizations can use any standard-compliant tool that generates DDI-CDI files:
- Export from statistical software packages
- Metadata management systems with CDI support
- Custom scripts using DDI-CDI libraries

**Workflow:**
1. Generate CDI file externally
2. Upload to Dataverse dataset
3. **Ensure MIME type is set correctly** during upload
4. Exporter and previewer automatically recognize the file

### 2. **Test Upload Tool (External Tool)**

A demonstration external tool is available for testing:

**URL:** https://erykkul.github.io/dataverse-previewers/examples/cdi/cdi-upload-tool.html

**Purpose:** Adds example CDI files from the DDI-CDI specification to datasets

**Registration:**
```bash
curl -X POST "http://localhost:8080/api/admin/externalTools" \
  -H "Content-Type: application/json" \
  --data @cdi-upload-tool.json
```

This tool is useful for:
- Testing CDI integration
- Demonstrating CDI functionality
- Training and documentation

### 3. **RDM Integration - Scheduled CDI Generation**

**Repository:** [libis/rdm-integration](https://github.com/libis/rdm-integration)  
**Documentation:** [ddi-cdi.md](https://github.com/libis/rdm-integration/blob/main/ddi-cdi.md)

The RDM Integration system provides **automated CDI file generation** through scheduled jobs:

**Key Features:**
- **Triggered by users**: Dataset owners initiate CDI generation
- **File analysis**: Examines dataset files using generic tools
- **Metadata extraction**: Combines file content analysis with dataset metadata
- **Automatic upload**: Generated CDI file is saved directly to the dataset
- **Correct MIME type**: Ensures proper MIME type for exporter/previewer compatibility

**Use Cases:**
- Bulk CDI generation for existing datasets
- Periodic metadata updates
- Integration with institutional workflows

### 4. **LLM-Powered Orchestration (n8n.io)**

**Developer:** Slava Thykonov  
**Platform:** n8n.io (workflow automation)

Modern AI-powered tools leverage Large Language Models (LLMs) for intelligent CDI generation:

**Architecture (from diagram):**
```
Entry Point → n8n.io Orchestration → Output
     ↓                                   ↓
Dataverse External Tools          Generic Tools
     ↓                                   
CDI file detection → Previewer
```

**Workflow:**
1. **Entry point**: User triggers from Dataverse external tool interface
2. **Orchestration**: n8n.io workflow coordinates:
   - File analysis
   - Metadata extraction
   - Context understanding via LLM
   - CDI generation
3. **Output**: Generated CDI file with rich, context-aware metadata
4. **Integration**: File saved back to dataset with correct MIME type

**Advantages:**
- **Context understanding**: LLM interprets file content semantically
- **Rich metadata**: Generates comprehensive CDI structures
- **Flexible**: Can integrate with various data sources
- **Adaptive**: Learns from examples and user feedback

**API/Hosting Integration:**
The n8n.io orchestration can be:
- Hosted independently
- Integrated with institutional APIs
- Embedded in larger data management workflows

---

## Technical Deep Dive: Workshop Achievements

### Problem 1: Transformer Not Finding CDI Files

**Initial Issue:**
- Transformer generated metadata even when CDI files existed
- HTTP calls to fetch files were failing
- Site URL extraction was problematic

**Solution:**
1. **Site URL Extraction**: Implemented multi-strategy approach
   ```python
   # Extract from ORE export @id
   if '/dataset.xhtml' in dataset_url:
       site_url = dataset_url.split('/dataset.xhtml')[0]
   elif '/citation' in dataset_url:
       site_url = dataset_url.split('/citation')[0]
   elif '/api/' in dataset_url:
       site_url = dataset_url.split('/api/')[0]
   else:
       # Fallback to localhost or config
       site_url = 'http://localhost:8080'
   ```

2. **File Discovery**: Files already available in export metadata structure
   ```python
   files = x['datasetJson']['datasetVersion']['files']
   ```
   No additional HTTP calls needed!

3. **Order of Operations**: Extract site_url **before** checking files (critical fix)

**Result:**
- Transformer correctly identifies existing CDI files
- Returns `WideDataSet` (26 nodes) for existing files
- Falls back to `DataSet` (7 nodes) when generating metadata

### Problem 2: MIME Type Inconsistency

**Initial Issue:**
- File ID 35 had MIME type: `application/ld+json;profile="..."` (no space)
- External tool expected: `application/ld+json; profile="..."` (with space)
- Previewer wouldn't activate due to exact string matching

**Analysis:**
The "chain" of MIME type usage:
1. External tool registration defines expected MIME type
2. CdiPreview.html sets MIME type when saving files
3. Dataverse stores MIME type with files
4. Previewer matches against stored MIME type to activate

**Critical Insight:**
Changing the external tool registration would break the entire chain, as it's the authoritative source.

**Solution:**
Standardized on **no space** after semicolon: `application/ld+json;profile="..."`
- Updated CdiPreview.html save logic
- Maintained consistency across all operations
- Documented requirement clearly

### Problem 3: Edit Mode Usability

**Requirements:**
Users needed to edit CDI files that were auto-generated or imported from other tools.

**Implemented Features:**

1. **SHACL-Based Validation**
   - Loaded DDI-CDI SHACL shapes
   - Distinguished specification-defined vs user-added properties
   - Visual indicators for field types

2. **Required Field Indicators**
   - Red "REQUIRED" badges
   - Thick red borders
   - ⚠️ symbols in property dropdown
   - Prevents deletion of required fields

3. **Type Enforcement**
   ```javascript
   // sh:datatype → HTML input type mapping
   xsd:integer → <input type="number">
   xsd:date → <input type="date">
   xsd:dateTime → <input type="datetime-local">
   xsd:anyURI → <input type="url">
   ```

4. **Nested Object Support**
   - Create complex properties with `[object]` type
   - Auto-generate `@id` for new nodes
   - Set correct `@type` based on SHACL `sh:class`
   - Maintain graph referential integrity

5. **Delete Functionality**
   - Trash icons for array values
   - Delete optional properties entirely
   - Confirmation for destructive operations

6. **Professional UI**
   - Color-coded borders (blue/yellow/red)
   - Searchable property dropdown with type-ahead
   - Collapsible sections for large graphs
   - Legend explaining visual conventions

---

## Deployment and Testing

### Test Environment

**Setup:**
- Dataverse 6.8 instance
- Docker-based development environment
- Integrated with RDM Integration platform

**Test Datasets:**
- `doi:10.5072/FK2/MIAGLB` - Dataset with existing CDI file (file ID 32)
- Multiple datasets for testing auto-generation
- Example CDI files from DDI specification

### Verification

**Exporter Testing:**
```bash
# Test with existing CDI file
curl "http://localhost:8080/api/datasets/export?exporter=cdi&persistentId=doi:10.5072/FK2/MIAGLB" \
  | python3 -c "import sys, json; d=json.load(sys.stdin); print('Type:', d['@graph'][0]['@type'], 'Nodes:', len(d['@graph']))"

# Expected: Type: WideDataSet Nodes: 26
```

**Previewer Testing:**
1. Upload CDI file with correct MIME type
2. Verify "View CDI Metadata" tool appears
3. Test visualization mode
4. Enter edit mode
5. Modify metadata
6. Save changes (replace file)
7. Verify MIME type preserved after save

### Known Issues and Limitations

1. **MIME Type Sensitivity**
   - Must be exact match for previewer activation
   - No space after semicolon in current implementation
   - Future: Consider more flexible MIME type matching

2. **Browser Compatibility**
   - Tested primarily in Chrome/Firefox
   - Safari requires CORS configuration for some features

3. **Large Graph Performance**
   - Very large CDI files (100+ nodes) may have slow rendering
   - Consider pagination or lazy loading in future versions

---

## Future Enhancements

### Planned Features

1. **Undo/Reset Functionality**
   - Revert changes without reloading page
   - Multiple undo levels
   - Compare current vs original

2. **Password Protection**
   - Lock edit mode behind API token verification
   - Role-based editing permissions
   - Audit trail for changes

3. **Controlled Vocabularies**
   - Dropdown menus for `sh:in` constraints
   - Autocomplete for common values
   - Integration with vocabulary services

4. **Enhanced Validation**
   - Real-time SHACL validation
   - Error highlighting and explanations
   - Validation report before save

5. **Import/Export Formats**
   - Support additional RDF serializations
   - JSON-LD context management
   - DDI Codebook conversion

### Integration Opportunities

1. **Dataverse API Extensions**
   - Native CDI MIME type support in Dataverse core
   - API endpoints for CDI validation
   - Metadata crosswalk improvements

2. **Workflow Integration**
   - GitHub Actions for automated CDI generation
   - CI/CD pipelines for metadata quality checks
   - Integration with DMPTool and other services

3. **Community Tools**
   - CDI template library
   - Best practices documentation
   - Training materials and workshops

---

## Standards Compliance

### DDI-CDI Specification
- **Version:** 1.0
- **Format:** JSON-LD (flattened + compacted profiles)
- **Schema:** https://ddialliance.org/specification/ddi-cdi/1.0

### SHACL Validation
- Uses official DDI-CDI SHACL shapes
- Validates property constraints
- Enforces cardinality and datatype requirements

### Dataverse Integration
- Follows Dataverse exporter plugin pattern
- Uses external tools API (no core modifications)
- Compatible with Dataverse 5.2+

---

## Conclusion

The DDI-CDI integration workshop successfully delivered two production-ready components that add comprehensive CDI support to Dataverse:

**✅ Achievements:**
- Non-intrusive plugin architecture
- Intelligent fallback generation
- Full-featured previewer and editor
- Multiple generation pathways
- Standards-compliant implementation
- Ready for GDCC contribution

**🎯 Impact:**
- Enhances Dataverse's metadata capabilities
- Enables cross-domain data integration
- Supports advanced use cases (LLM-powered generation, orchestration)
- Provides rich editing experience for researchers
- Maintains compatibility with existing Dataverse deployments

**🚀 Next Steps:**
1. Submit PR to gdcc/dataverse-previewers
2. Document deployment procedures
3. Create video tutorials
4. Gather user feedback
5. Iterate on enhanced features

The implementation demonstrates how modern tools (LLMs, orchestration platforms) can be integrated with repository systems through well-designed plugin architectures, enabling powerful metadata workflows without compromising system stability or maintainability.

---

## References

- **DDI-CDI Specification:** https://ddialliance.org/specification/ddi-cdi/1.0
- **Exporter Repository:** https://github.com/gdcc/exporter-transformer/
- **Previewer Repository:** https://github.com/gdcc/dataverse-previewers
- **RDM Integration:** https://github.com/libis/rdm-integration
- **Test Upload Tool:** https://erykkul.github.io/dataverse-previewers/examples/cdi/cdi-upload-tool.html

## Contributors

- **Eryk Kulikowski** - Implementation (exporter, previewer, RDM integration)
- **Slava Thykonov** - n8n.io orchestration and LLM integration
- **Workshop Participants** - Testing, feedback, and use case validation

---

*Document created: November 13, 2025*  
*Last updated: November 13, 2025*
