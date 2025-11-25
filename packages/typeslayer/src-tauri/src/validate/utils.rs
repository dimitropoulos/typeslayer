use serde::{Deserialize, Serialize};

pub const CPU_PROFILE_FILENAME: &str = "tsc.cpuprofile";

/// TypeId corresponds to z.number().int().positive().or(z.literal(-1)) in TS.
/// We keep it as i64 to be safe with larger ids.
pub type TypeId = i64;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub line: TypeId,
    pub character: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Location {
    pub path: String,
    pub start: Position,
    pub end: Position,
}
