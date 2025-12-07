use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

/// Represents a parameter for an MCP tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolParameter {
    pub name: String,
    pub optional: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<Value>,
    pub description: String,
}

/// Represents the definition of an MCP tool
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct ToolDefinition {
    pub command: String,
    pub displayName: String,
    pub description: String,
    pub parameters: Vec<ToolParameter>,
    pub returns: Value,
}

/// Returns all available MCP tools
pub fn get_available_tools() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            command: "get_hotspots".to_string(),
            displayName: "Get Type Hotspots".to_string(),
            description: "Analyzes TypeScript compilation traces to identify performance hotspots - the types that take the most time to check.".to_string(),
            parameters: vec![
                ToolParameter {
                    name: "skip_millis".to_string(),
                    optional: true,
                    default: Some(json!(50)),
                    description: "Minimum duration in milliseconds to include a hotspot".to_string(),
                },
                ToolParameter {
                    name: "force_millis".to_string(),
                    optional: true,
                    default: Some(json!(500)),
                    description: "Force inclusion of hotspots above this duration".to_string(),
                },
                ToolParameter {
                    name: "limit".to_string(),
                    optional: true,
                    default: Some(json!(100)),
                    description: "Maximum number of hotspots to return".to_string(),
                },
            ],
            returns: json!({
                "hotspots": [
                    {
                        "duration_ms": 1250.5,
                        "type_id": 12345,
                        "type_display": "Promise<User[]>",
                        "file_path": "/src/models/user.ts",
                        "symbol_name": "getUserList"
                    }
                ],
                "total_hotspots": 156,
                "filter_settings": {
                    "skip_millis": 50.0,
                    "force_millis": 500.0,
                    "limit": 100
                }
            }),
        },
    ]
}
