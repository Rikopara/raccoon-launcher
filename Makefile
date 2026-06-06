UUID    = raccoonlauncher@shimafallah.github.io
EXT_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
SOURCES = metadata.json extension.js prefs.js stylesheet.css lib schemas

.PHONY: schemas install uninstall pack lint nested test

# Compile the GSettings schema (needed before the extension can load).
schemas:
	glib-compile-schemas schemas/

# Copy the extension into the local extensions directory.
install: schemas
	rm -rf "$(EXT_DIR)"
	mkdir -p "$(EXT_DIR)"
	cp -r $(SOURCES) "$(EXT_DIR)/"
	@echo "Installed to $(EXT_DIR)"
	@echo "Enable with: gnome-extensions enable $(UUID)"
	@echo "On Wayland you must log out and back in (or use 'make nested')."

uninstall:
	rm -rf "$(EXT_DIR)"
	@echo "Removed $(EXT_DIR)"

# Build the zip you upload to extensions.gnome.org.
pack: schemas
	gnome-extensions pack --force --extra-source=lib .
	@echo "Created $(UUID).shell-extension.zip"

# Syntax-check every JS file.
lint:
	@for f in extension.js prefs.js $$(find lib -name '*.js'); do \
		echo "checking $$f"; \
		gjs -c "$$(cat $$f)" >/dev/null || exit 1; \
	done
	@echo "OK"

# Launch a nested GNOME Shell for manual testing (GNOME 49+ uses --devkit;
# needs the mutter-devkit viewer installed). For automated checks use 'make test'.
nested:
	dbus-run-session -- gnome-shell --devkit

# Load the extension in a private headless shell and verify open/close work.
test:
	./tools/smoketest.sh
