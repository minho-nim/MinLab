use base64::{engine::general_purpose::STANDARD, Engine};
use minisign_verify::{PublicKey, Signature};
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 4 {
        return Err("usage: verify_update <tauri.conf.json> <installer> <signature>".into());
    }
    let config: serde_json::Value = serde_json::from_slice(&std::fs::read(&args[1])?)?;
    let public = config["plugins"]["updater"]["pubkey"]
        .as_str()
        .ok_or("missing updater public key")?;
    let public = PublicKey::decode(&String::from_utf8(STANDARD.decode(public)?)?)?;
    let signature = Signature::decode(&String::from_utf8(
        STANDARD.decode(std::fs::read_to_string(&args[3])?.trim())?,
    )?)?;
    public.verify(&std::fs::read(&args[2])?, &signature, true)?;
    let signed = signature
        .trusted_comment()
        .split('\t')
        .find_map(|field| field.strip_prefix("version:"))
        .ok_or("signature has no signed version")?;
    if Some(signed) != config["version"].as_str() {
        return Err("signed version does not match app version".into());
    }
    println!("Updater signature and signed version verified");
    Ok(())
}
