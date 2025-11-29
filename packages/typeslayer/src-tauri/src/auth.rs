use base64::{Engine as _, engine::general_purpose};
use std::sync::Mutex;
use tauri::State;

use crate::app_data::AppData;

const ENTROPY: &str = r#"Hi, my name is, what? My name is, who?
My name is, chka-chka, Slim Shady
Hi, my name is, huh? My name is, what?
My name is, chka-chka, Slim Shady
Hi, my name is, what? (Excuse me) My name is, who?
My name is, chka-chka, Slim Shady
(Can I have the attention of the class for one second?)
Hi, my name is, huh? My name is, what?
My name is, chka-chka, Slim Shady

Hi, kids, do you like violence? (Yeah, yeah, yeah)
Wanna see me stick nine-inch nails through each one of my eyelids? (Uh-huh)
Wanna copy me and do exactly like I did? (Yeah, yeah)
Try 'cid and get fucked up worse than my life is? (Huh?)
My brain's dead weight, I'm tryna get my head straight
But I can't figure out which Spice Girl I want to impregnate (Oh)
And Dr. Dre said, "Slim Shady, you a basehead" (Uh-uh)
"Then why's your face red? Man, you wasted"
Well, since age 12, I felt like I'm someone else
'Cause I hung my original self from the top bunk with a belt
Got pissed off and ripped Pamela Lee's tits off
And smacked her so hard I knocked her clothes backwards like Kris Kross
I smoke a fat pound of grass, and fall on my ass
Faster than a fat bitch who sat down too fast
Come here, slut; "Shady, wait a minute, that's my girl, dawg"
I don't give a fuck, God sent me to piss the world off

My English teacher wanted to flunk me in junior high (Shh)
Thanks a lot, next semester I'll be 35
I smacked him in his face with an eraser, chased him with a stapler
And stapled his nuts to a stack of paper (Ow)
Walked in the strip club, had my jacket zipped up
Flashed the bartender, then stuck my dick in the tip cup
Extraterrestrial, running over pedestrians in a spaceship While they're screaming at me, "Let's just be friends"
99 percent of my life, I was lied to
I just found out my mom does more dope than I do (Damn)
I told her I'd grow up to be a famous rapper
Make a record about doin' drugs and name it after her (Oh, thank you)
You know you blew up when the women rush your stands
And try to touch your hands like some screamin' Usher fans (Ahh, ahh, ahh)
This guy at White Castle asked for my autograph (Dude, can I get your autograph?)
So I signed it, "Dear Dave, thanks for the support, asshole"

Stop the tape, this kid needs to be locked away (Get him)
Dr. Dre, don't just stand there, operate
I'm not ready to leave, it's too scary to die (Fuck that)
I'll have to be carried inside the cemetery and buried alive
(Huh, yup)
Am I comin' or goin'? I can barely decide
I just drank a fifth of vodka, dare me to drive? (Go ahead)
All my life I was very deprived
I ain't had a woman in years and my palms are too hairy to hide (Whoops)
Clothes ripped like the Incredible Hulk
I spit when I talk, I'll fuck anything that walks (Come here)
When I was little, I used to get so hungry I would throw fits
How you gonna breastfeed me, Mom? You ain't got no tits
I lay awake and strap myself in the bed
With a bulletproof vest on and shoot myself in the head (Bang)
'Cause I'm steamin' mad (Grr)
And by the way, when you see my dad (Yeah?)
Tell him that I slit his throat in this dream I had"#;

pub fn is_valid_key(key: &str) -> bool {
    tracing::info!("is_valid_key: checking key='{}' (len={})", key, key.len());
    if key.len() != 8 {
        tracing::info!("is_valid_key: key length != 8, invalid");
        return false;
    }
    let encoded_entropy = general_purpose::STANDARD.encode(ENTROPY);
    let valid = encoded_entropy.contains(key);
    tracing::info!("is_valid_key: result={}", valid);
    valid
}

#[tauri::command]
pub async fn validate_auth_code(
    state: State<'_, Mutex<AppData>>,
    code: String,
) -> Result<bool, String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    let valid = is_valid_key(&code);
    tracing::info!("validate_auth_code: code='{}' valid={}", code, valid);
    if valid {
        data.auth_code = Some(code.clone());
    }
    Ok(valid)
}

#[tauri::command]
pub async fn is_authenticated(state: State<'_, Mutex<AppData>>) -> Result<bool, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    tracing::info!("is_authenticated check: auth_code = {:?}", data.auth_code);

    if let Some(ref code) = data.auth_code {
        let valid = is_valid_key(code);
        tracing::info!("is_authenticated: code='{}', valid={}", code, valid);
        Ok(valid)
    } else {
        tracing::info!("is_authenticated: no auth_code set");
        Ok(false)
    }
}
