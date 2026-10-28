export const PHONE_TEMPLATES = {
  smartphone: [
    { group: "General", label: "Brand", value: "{brand}" },
    { group: "General", label: "Model", value: "{subtype}" },
    { group: "Memory & Storage Features", label: "RAM", value: "{ram}" },
    { group: "Memory & Storage Features", label: "Internal Storage", value: "{storage}" },
    { group: "Display Features", label: "Display Size", value: "{screenSize}" },
    { group: "OS & Processor Features", label: "Processor Type", value: "{processor}" },
    { group: "Warranty", label: "Warranty Summary", value: "{warrantyMonths} Months Manufacturer Warranty" },
  ],
};

export const APPLIANCE_TEMPLATES = {
  "washing-machine": [
    { group: "General", label: "Brand", value: "{brand}" },
    { group: "General", label: "Model", value: "{subtype}" },
    { group: "General", label: "Type", value: "{categoryName}" },
    { group: "Warranty", label: "Warranty Summary", value: "{warrantyMonths} Months Manufacturer Warranty" },
  ],
};