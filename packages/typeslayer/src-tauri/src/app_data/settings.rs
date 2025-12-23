use strum_macros::EnumString;

#[derive(Clone, Copy, Default, Debug, serde::Serialize, serde::Deserialize, EnumString)]
pub enum TypeScriptCompilerVariant {
    #[serde(rename = "tsc")]
    #[strum(serialize = "tsc")]
    #[default]
    Strata,
    #[serde(rename = "vue-tsc")]
    #[strum(serialize = "vue-tsc")]
    Vue,
    #[serde(rename = "tsgo")]
    #[strum(serialize = "tsgo")]
    Corsa,
}

impl TypeScriptCompilerVariant {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Strata => "tsc",
            Self::Vue => "vue-tsc",
            Self::Corsa => "tsgo",
        }
    }

    pub fn npm_package(&self) -> &'static str {
        match self {
            Self::Strata => "typescript",
            Self::Vue => "vue-tsc",
            Self::Corsa => "@typescript/native-preview",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub relative_paths: bool,
    pub prefer_editor_open: bool,
    pub auto_start: bool,
    pub preferred_editor: Option<String>,
    pub extra_tsc_flags: String,
    pub apply_tsc_project_flag: bool,
    pub max_old_space_size: Option<i32>,
    pub max_stack_size: Option<i32>,
    pub typescript_compiler_variant: TypeScriptCompilerVariant,
    pub max_nodes: i32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            relative_paths: true,
            prefer_editor_open: true,
            auto_start: true,
            preferred_editor: Some("code".to_string()),
            extra_tsc_flags: "--noEmit --incremental false --noErrorTruncation".to_string(),
            apply_tsc_project_flag: true,
            max_old_space_size: None,
            max_stack_size: None,
            typescript_compiler_variant: TypeScriptCompilerVariant::default(),
            max_nodes: 3_000_000,
        }
    }
}
