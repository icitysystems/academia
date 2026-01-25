/**
 * Accessibility Utilities
 * Provides helper functions and components for improving accessibility
 */

/**
 * Generate unique IDs for accessibility attributes
 */
export const generateA11yId = (prefix: string): string => {
	return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Provides accessible props for tab panels
 */
export const getTabPanelA11yProps = (tabId: string, index: number) => {
	return {
		"id": `${tabId}-tabpanel-${index}`,
		"aria-labelledby": `${tabId}-tab-${index}`,
		"role": "tabpanel",
	};
};

/**
 * Provides accessible props for tabs
 */
export const getTabA11yProps = (tabId: string, index: number) => {
	return {
		"id": `${tabId}-tab-${index}`,
		"aria-controls": `${tabId}-tabpanel-${index}`,
	};
};

/**
 * Skip to main content link props
 */
export const skipLinkStyles = {
	"position": "absolute" as const,
	"left": "-9999px",
	"zIndex": 999,
	"padding": "1rem",
	"backgroundColor": "#000",
	"color": "#fff",
	"textDecoration": "none",
	"&:focus": {
		left: 0,
		top: 0,
	},
};

/**
 * Visually hidden but accessible to screen readers
 */
export const visuallyHidden = {
	position: "absolute" as const,
	width: "1px",
	height: "1px",
	padding: 0,
	margin: "-1px",
	overflow: "hidden",
	clip: "rect(0, 0, 0, 0)",
	whiteSpace: "nowrap" as const,
	border: 0,
};

/**
 * Focus visible styles for keyboard navigation
 */
export const focusVisibleStyles = {
	"&:focus-visible": {
		outline: "2px solid #1976d2",
		outlineOffset: "2px",
	},
};

/**
 * Live region announcements for screen readers
 */
export const liveRegionProps = (
	politeness: "polite" | "assertive" = "polite",
) => ({
	"aria-live": politeness,
	"aria-atomic": true,
});

/**
 * Button accessibility props
 */
export const getButtonA11yProps = (
	label: string,
	options?: {
		expanded?: boolean;
		controls?: string;
		pressed?: boolean;
		disabled?: boolean;
	},
) => ({
	"aria-label": label,
	...(options?.expanded !== undefined && { "aria-expanded": options.expanded }),
	...(options?.controls && { "aria-controls": options.controls }),
	...(options?.pressed !== undefined && { "aria-pressed": options.pressed }),
	...(options?.disabled && { "aria-disabled": options.disabled }),
});

/**
 * Form field accessibility props
 */
export const getFormFieldA11yProps = (
	fieldId: string,
	options?: {
		required?: boolean;
		invalid?: boolean;
		describedBy?: string;
		errorId?: string;
	},
) => ({
	"id": fieldId,
	"aria-required": options?.required,
	"aria-invalid": options?.invalid,
	"aria-describedby":
		options?.describedBy || (options?.errorId ? options.errorId : undefined),
});

/**
 * Dialog accessibility props
 */
export const getDialogA11yProps = (
	titleId: string,
	descriptionId?: string,
) => ({
	"role": "dialog",
	"aria-modal": true,
	"aria-labelledby": titleId,
	...(descriptionId && { "aria-describedby": descriptionId }),
});

/**
 * Alert accessibility props
 */
export const getAlertA11yProps = (
	severity: "error" | "warning" | "info" | "success",
) => ({
	"role": "alert",
	"aria-live":
		severity === "error" ? ("assertive" as const) : ("polite" as const),
});

/**
 * Table accessibility props
 */
export const getTableA11yProps = (caption: string) => ({
	"role": "table",
	"aria-label": caption,
});

/**
 * Navigation accessibility props
 */
export const getNavA11yProps = (label: string) => ({
	"role": "navigation",
	"aria-label": label,
});

/**
 * Loading indicator accessibility
 */
export const getLoadingA11yProps = (
	isLoading: boolean,
	loadingText = "Loading...",
) => ({
	"aria-busy": isLoading,
	"aria-live": "polite" as const,
	...(isLoading && { "aria-label": loadingText }),
});

/**
 * Image accessibility - determines if alt is needed
 */
export const getImageA11yProps = (altText: string, isDecorative = false) => ({
	alt: isDecorative ? "" : altText,
	...(isDecorative && { role: "presentation" }),
});

/**
 * Link that opens in new tab accessibility
 */
export const getExternalLinkA11yProps = (linkText: string) => ({
	"target": "_blank",
	"rel": "noopener noreferrer",
	"aria-label": `${linkText} (opens in new tab)`,
});

/**
 * Progress indicator accessibility
 */
export const getProgressA11yProps = (
	value: number,
	max: number,
	label: string,
) => ({
	"role": "progressbar",
	"aria-valuenow": value,
	"aria-valuemin": 0,
	"aria-valuemax": max,
	"aria-label": label,
	"aria-valuetext": `${Math.round((value / max) * 100)}% complete`,
});

/**
 * Search input accessibility
 */
export const getSearchA11yProps = (placeholder: string) => ({
	"role": "search",
	"aria-label": placeholder,
	"type": "search",
});

/**
 * Tooltip trigger accessibility
 */
export const getTooltipTriggerA11yProps = (tooltipId: string) => ({
	"aria-describedby": tooltipId,
});

/**
 * Breadcrumb navigation accessibility
 */
export const getBreadcrumbA11yProps = () => ({
	"aria-label": "Breadcrumb navigation",
	"role": "navigation",
});

/**
 * Menu accessibility
 */
export const getMenuA11yProps = (
	buttonId: string,
	menuId: string,
	isOpen: boolean,
) => ({
	button: {
		"id": buttonId,
		"aria-haspopup": true,
		"aria-expanded": isOpen,
		"aria-controls": menuId,
	},
	menu: {
		"id": menuId,
		"aria-labelledby": buttonId,
		"role": "menu",
	},
});

/**
 * Checkbox group accessibility
 */
export const getCheckboxGroupA11yProps = (groupLabel: string) => ({
	"role": "group",
	"aria-label": groupLabel,
});

/**
 * Radio group accessibility
 */
export const getRadioGroupA11yProps = (groupLabel: string) => ({
	"role": "radiogroup",
	"aria-label": groupLabel,
});
