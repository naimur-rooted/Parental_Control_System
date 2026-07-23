allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}

subprojects {
    project.evaluationDependsOn(":app")
}

// Fixed namespace logic using a more robust root-level block
subprojects {
    plugins.whenPluginAdded {
        if (this.toString().contains("com.android.build.gradle.LibraryPlugin") || 
            this.toString().contains("com.android.build.gradle.AppPlugin")) {
            val android = project.extensions.findByName("android")
            if (android != null) {
                val setNamespaceMethod = android::class.java.methods.find { it.name == "setNamespace" }
                val getNamespaceMethod = android::class.java.methods.find { it.name == "getNamespace" }
                val currentNamespace = try { getNamespaceMethod?.invoke(android) } catch (e: Exception) { null }

                if (currentNamespace == null && setNamespaceMethod != null) {
                    val manifestFile = project.file("src/main/AndroidManifest.xml")
                    if (manifestFile.exists()) {
                        val manifest = manifestFile.readText()
                        val packageMatch = Regex("package=\"([^\"]+)\"").find(manifest)
                        if (packageMatch != null) {
                            setNamespaceMethod.invoke(android, packageMatch.groupValues[1])
                        }
                    } else {
                        setNamespaceMethod.invoke(android, "com.example.family_guardian_child_app.${project.name.replace(":", ".").replace("-", "_")}")
                    }
                }
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
