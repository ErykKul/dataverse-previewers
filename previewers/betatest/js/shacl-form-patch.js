/**
 * Guard the shacl-form implementation so that multi-value blank nodes remain visible even when
 * nested nodes currently violate their shape (e.g., missing required fields). Without this guard
 * the component drops every value after validation and users cannot fix the data.
 * 
 * This patch must be loaded AFTER the shacl-form web component is imported.
 */

(function() {
    'use strict';
    
    // Wait for custom elements to be defined
    async function applyPatch() {
        // Wait for shacl-property element to be defined
        await customElements.whenDefined('shacl-property');
        
        const shaclPropertyCtor = customElements.get('shacl-property');
        
        if (shaclPropertyCtor && !shaclPropertyCtor.__rdmFilterGuardApplied) {
            const prototype = shaclPropertyCtor.prototype;
            const originalFilter = prototype.filterValidValues;
            
            if (typeof originalFilter === 'function') {
                console.log('[SHACL Patch] Applying filterValidValues guard for multi-value blank nodes');
                
                prototype.filterValidValues = async function(values, subject) {
                    // If there's no qualifiedValueShape, don't filter - keep all values
                    if (!this?.template?.qualifiedValueShape) {
                        return values;
                    }
                    
                    // Otherwise, use the original validation logic
                    return originalFilter.call(this, values, subject);
                };
                
                shaclPropertyCtor.__rdmFilterGuardApplied = true;
                console.log('[SHACL Patch] Guard applied successfully');
            } else {
                console.warn('[SHACL Patch] filterValidValues method not found');
            }
        } else if (shaclPropertyCtor?.__rdmFilterGuardApplied) {
            console.log('[SHACL Patch] Guard already applied');
        } else {
            console.error('[SHACL Patch] shacl-property element not found');
        }
    }
    
    // Apply patch when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyPatch);
    } else {
        applyPatch();
    }
})();
