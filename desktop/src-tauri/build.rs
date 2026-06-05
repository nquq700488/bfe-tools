fn main() {
    println!("cargo::rustc-check-cfg=cfg(embed_mode)");
    if std::env::var("BFE_EMBED").is_ok() {
        println!("cargo:rustc-cfg=embed_mode");
    }
    tauri_build::build()
}
