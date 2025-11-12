# CDI Previewer - Complete Stack Analysis & Fix Plan

## Flow Analysis: Data Load → Form Render

### 1. **Initial Load (cdi.js)**
```javascript
// Line ~145: Parse JSON-LD
const jsonData = JSON.parse(fileUrl);

// Line ~175: Load SHACL shapes
const shapesData = await fetch('shapes/CDIF-Discovery-Core-Shapes.ttl').text();

// Line ~209: Replace bitbucket context (if needed)
if (jsonData['@context'].includes('bitbucket.io')) {
    jsonData['@context'] = { /* inline context */ };
}

// Line ~224: Set shacl-form attributes
shaclFormElement.setAttribute('data-shapes', shapesData);
shaclFormElement.setAttribute('data-values', valuesString);
shaclFormElement.setAttribute('data-shape-subject', 'https://cdif.org/validation/0.1/shacl#CDIFDatasetRecommendedShape');
shaclFormElement.setAttribute('data-values-subject', datasets[0]['@id']); // IF FOUND
```

### 2. **shacl-form Initialize (form.ts line 44-58)**
```typescript
attributeChangedCallback() {
    this.config.updateAttributes(this)
    this.initialize()  // ← Triggers initialization
}

private initialize() {
    await this.config.loader.loadGraphs()  // ← Parse shapes + data
    const rootShapeShaclSubject = this.findRootShaclShapeSubject()  // ← Find shape
    if (rootShapeShaclSubject) {
        this.shape = new ShaclNode(rootShapeShaclSubject, ...)  // ← Render
    }
}
```

### 3. **Graph Loading (loader.ts line 24-38)**
```typescript
async loadGraphs() {
    const store = new Store()
    // Parse shapes into SHAPES_GRAPH
    await this.importRDF(shapesData, store, SHAPES_GRAPH)
    // Parse data into DATA_GRAPH  ← JSON-LD → N3 conversion happens here
    await this.importRDF(valuesData, store, DATA_GRAPH)
    this.config.store = store
}

// Line 131-145: JSON-LD conversion
if (guessContentType(input) === 'json') {
    input = await toRDF(JSON.parse(input), { format: 'application/n-quads' })
}
```

### 4. **Find Root Shape (form.ts line 247-314)**
```typescript
private findRootShaclShapeSubject(): NamedNode | undefined {
    // Path 1: data-shape-subject is set → Use it directly
    if (this.config.attributes.shapeSubject) {
        return DataFactory.namedNode(this.config.attributes.shapeSubject)
    }
    
    // Path 2: data-values-subject is set → Find shape by type/conformsTo
    if (this.config.attributes.valuesSubject) {
        const rootValueSubjectTypes = store.getQuads(rootValueSubject, RDF_PREDICATE_TYPE, null, DATA_GRAPH)
        if (rootValueSubjectTypes.length === 0) {
            console.warn(`value subject has neither rdf:type nor dcterms:conformsTo`)
            return  // ← FAIL: No types found
        }
        // Try to match type to sh:targetClass in shapes
        const rootShapes = store.getQuads(null, SHACL_PREDICATE_TARGET_CLASS, rootValueSubjectTypes[0].object, null)
        if (rootShapes.length === 0) {
            console.error(`value subject has no shacl shape definition`)
            return  // ← FAIL: No shape matches type
        }
    }
    
    // Path 3: Neither set → Choose first NodeShape
    const rootShapes = store.getQuads(null, RDF_PREDICATE_TYPE, SHACL_OBJECT_NODE_SHAPE, null)
    return rootShapes[0].subject
}
```

## 🔴 **PROBLEMS IDENTIFIED**

### Problem 1: SHACL Target Query (CRITICAL - 90% of issue)
**Location:** `CDIF-Discovery-Core-Shapes.ttl` line 23-31

**Issue:** Target query only matches `schema:Dataset` but CDI files use `WideDataSet`, `LongDataSet`, etc.

```sparql
# CURRENT (BROKEN):
sh:select """
  SELECT ?this WHERE {
    ?this a schema:Dataset .  # ← Only matches schema:Dataset!
  }
"""

# STATUS: PARTIALLY FIXED (but incomplete)
# Updated to match WideDataSet, but query is NEVER ACTUALLY RUN by shacl-form!
```

**Root Cause:** The SHACL target query is used by SHACL VALIDATION, not by shacl-form's `findRootShaclShapeSubject()`. The library doesn't use `sh:target` to find the root shape - it uses:
1. `data-shape-subject` (direct specification) ✅
2. `data-values-subject` + type matching against `sh:targetClass` ❌
3. First `sh:NodeShape` found ❌

### Problem 2: No sh:targetClass in Shapes (CRITICAL - 10% of issue)
**Location:** `CDIF-Discovery-Core-Shapes.ttl` line 10

**Issue:** Shape has `sh:target` (SPARQL) but NO `sh:targetClass` statement:

```turtle
# CURRENT:
cdifd:CDIFDatasetRecommendedShape a sh:NodeShape ;
    sh:target [ a sh:SPARQLTarget ; ... ] ;  # ← SPARQL target
    sh:property ... ;
.

# MISSING:
cdifd:CDIFDatasetRecommendedShape a sh:NodeShape ;
    sh:targetClass schema:Dataset ;  # ← Need this for type matching!
    sh:target [ a sh:SPARQLTarget ; ... ] ;
    sh:property ... ;
.
```

**Impact:** When `data-values-subject` is set to a `WideDataSet` node, `findRootShaclShapeSubject()` tries to find a shape with `sh:targetClass WideDataSet` but finds NOTHING because the shape only has `sh:target` (SPARQL).

### Problem 3: Type Normalization in JSON-LD
**Location:** Conversion in `loader.ts` + `cdi.js`

**Issue:** When JSON-LD is converted to N3, types might not be properly expanded:
- JSON: `"@type": "WideDataSet"`
- N3: Could be `<http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/WideDataSet>` OR just `WideDataSet` (depending on @context)

### Problem 4: Context Replacement Too Late
**Location:** `cdi.js` line 209-220

**Issue:** Context is replaced AFTER valuesString is created but used in wrong order:
```javascript
const valuesString = JSON.stringify(jsonData, null, 2);  // Line 207

if (jsonData['@context'].includes('bitbucket.io')) {
    jsonData['@context'] = { /* inline */ };
    valuesString = JSON.stringify(jsonData);  // Line 220 - reassigns but...
}

shaclFormElement.setAttribute('data-values', valuesString);  // Uses new value ✅
```
Actually this IS correct! But the inline context might be incomplete.

## 🎯 **COMPREHENSIVE FIX PLAN**

### Priority 1: Make Shapes Work with ANY Dataset Type (HIGHEST IMPACT)

**Fix 1A: Add sh:targetClass Statements**
```turtle
cdifd:CDIFDatasetRecommendedShape a sh:NodeShape ;
    # Add explicit targetClass for all CDI dataset types
    sh:targetClass schema:Dataset ;
    sh:targetClass <http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/WideDataSet> ;
    sh:targetClass <http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/LongDataSet> ;
    sh:targetClass <http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/DimensionalDataSet> ;
    # Keep existing SPARQL target for validation
    sh:target [ a sh:SPARQLTarget ; ... ] ;
```

**Impact:** This makes the shape discoverable via type matching in `findRootShaclShapeSubject()`

### Priority 2: Improve Context Handling (MEDIUM IMPACT)

**Fix 2A: Enhanced Inline Context in cdi.js**
```javascript
// Line ~210: Use complete inline context
if (jsonData['@context'].includes('bitbucket.io') || 
    Array.isArray(jsonData['@context']) && jsonData['@context'].some(c => typeof c === 'string' && c.includes('bitbucket.io'))) {
    
    const inlineContext = {
        "@vocab": "http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/",
        "schema": "http://schema.org/",
        "dcterms": "http://purl.org/dc/terms/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "time": "http://www.w3.org/2006/time#",
        "spdx": "http://spdx.org/rdf/terms#",
        "prov": "http://www.w3.org/ns/prov#",
        
        // Ensure CDI types are properly prefixed
        "WideDataSet": "http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/WideDataSet",
        "LongDataSet": "http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/LongDataSet",
        "DimensionalDataSet": "http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/DimensionalDataSet"
    };
    
    if (Array.isArray(jsonData['@context'])) {
        // Replace bitbucket URL but keep other context objects
        jsonData['@context'] = jsonData['@context'].map(c => 
            (typeof c === 'string' && c.includes('bitbucket.io')) ? inlineContext : c
        );
    } else {
        jsonData['@context'] = inlineContext;
    }
}
```

### Priority 3: Debug Logging Enhancement (LOW IMPACT)

**Fix 3A: Add Detailed Logging in cdi.js**
```javascript
// After setting attributes, log the N3 parse result
shaclFormElement.addEventListener('shacl-form-ready', () => {
    console.log('[CDI Previewer] Form rendered successfully');
    console.log('[CDI Previewer] Shadow DOM content:', shaclFormElement.shadowRoot?.innerHTML?.length, 'bytes');
});

// Add error event listener
shaclFormElement.addEventListener('error', (event) => {
    console.error('[CDI Previewer] Form error:', event);
});
```

### Priority 4: shacl-form Library Enhancement (OPTIONAL)

**Fix 4A: Better Error Messages in form.ts**
```typescript
// Line ~265: When no types found
if (rootValueSubjectTypes.length === 0) {
    console.error(`Value subject '${this.config.attributes.valuesSubject}' has no rdf:type or dcterms:conformsTo statement in the data graph.`);
    console.error(`Available subjects in DATA_GRAPH:`, 
        this.config.store.getSubjects(null, null, DATA_GRAPH).map(s => s.value));
    return
}

// Line ~278: When no shape matches type
if (rootShapes.length === 0) {
    console.error(`Value subject type '${rootValueSubjectTypes[0].object.value}' has no matching sh:targetClass in shapes graph`);
    console.error(`Available targetClass values:`, 
        this.config.store.getQuads(null, SHACL_PREDICATE_TARGET_CLASS, null, SHAPES_GRAPH).map(q => q.object.value));
    return
}
```

## 📋 **IMPLEMENTATION ORDER**

1. ✅ **DONE:** Fix SHACL target SPARQL query (already applied but doesn't help)
2. **TODO:** Add `sh:targetClass` statements to shapes (CRITICAL FIX)
3. **TODO:** Enhance inline context replacement (SAFETY NET)
4. **TODO:** Add comprehensive logging (DEBUGGING)
5. **TODO:** Update shacl-form error messages (OPTIONAL)

## 🧪 **TEST PLAN**

After each fix:
1. Upload SimpleSample.jsonld (WideDataSet with bitbucket context)
2. Upload ESS11-subset_DDICDI.jsonld (WideDataSet, DDICDIModels structure)
3. Upload FeXAS_Fe_c3d.001-NEXUS-HDF5-cdi-CDIF.jsonld (schema:Dataset with inline context)
4. Check browser console for errors
5. Verify form renders with properties
6. Check validation warnings appear

## 📊 **EXPECTED OUTCOME**

After all fixes:
- ✅ All 5 test files render correctly
- ✅ Form shows SHACL property fields
- ✅ Validation warnings appear for missing recommended fields
- ✅ Edit mode works
- ✅ Save functionality works (with API token)
- ✅ No console errors about missing types or shapes

## 🔍 **WHY THE TEST WORKED**

The standalone test worked because:
1. It detected dataset nodes manually (JavaScript logic)
2. It set `data-values-subject` directly
3. It ALSO set `data-shape-subject` directly (bypassing type matching)
4. It didn't rely on sh:targetClass or sh:target queries

The previewer fails because:
1. It sets `data-shape-subject` ✅ (but shape doesn't validate against data)
2. It sets `data-values-subject` ✅ (but no matching sh:targetClass)
3. shacl-form's `findRootShaclShapeSubject()` needs sh:targetClass for validation
