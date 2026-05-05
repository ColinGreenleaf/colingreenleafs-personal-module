
const MODULE_ID = 'colingreenleafs-personal-module';


export const registerSettings = () => {
//   const MODULE_ID = 'colingreenleafs-personal-module';
  const reloadOnChange = { onChange: () => SettingsConfig.reloadConfirm({ world: true }) };

    game.settings.register(MODULE_ID, "OverlayVisualization", {
        name: `${MODULE_ID}.Settings.OverlayVisualization.Name`,
        hint: `${MODULE_ID}.Settings.OverlayVisualization.Hint`,
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        ...reloadOnChange
    });

    game.settings.register(MODULE_ID, 'OverlayStyle', {
        name: `${MODULE_ID}.Settings.OverlayStyle.Name`,
        hint: `${MODULE_ID}.Settings.OverlayStyle.Hint`,
        scope: "world", config: true, type: String,
        choices: {
        'gradient': `${MODULE_ID}.Settings.OverlayStyle.Choice.gradient`,
        'color': `${MODULE_ID}.Settings.OverlayStyle.Choice.color`,
        },
        default: 'gradient',
        ...reloadOnChange
    });

    game.settings.register(MODULE_ID, "NumberOverlay", {
        name: `${MODULE_ID}.Settings.NumberOverlay.Name`,
        hint: `${MODULE_ID}.Settings.NumberOverlay.Hint`,
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        ...reloadOnChange
    });
    game.settings.register(MODULE_ID, "NumberOverlayColor", {
        name: `${MODULE_ID}.Settings.NumberOverlayColor.Name`,
        hint: `${MODULE_ID}.Settings.NumberOverlayColor.Hint`,
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        ...reloadOnChange        
    });

    game.settings.register(MODULE_ID, "ElevationColor1", {
        name: "Elevation 1 Color",
        scope: "world",
        config: true,
        type: String,
        default: "#ffff00",
        ...reloadOnChange
    });

    game.settings.register(MODULE_ID, "ElevationColor2", {
        name: "Elevation 2 Color",
        scope: "world",
        config: true,
        type: String,
        default: "#ff8800",
        ...reloadOnChange
    });

    game.settings.register(MODULE_ID, "ElevationColor3", {
        name: "Elevation 3 Color",
        scope: "world",
        config: true,
        type: String,
        default: "#ff0000",
        ...reloadOnChange
    });

    game.settings.register(MODULE_ID, "ElevationColor4", {
        name: "Elevation 4 Color",
        scope: "world",
        config: true,
        type: String,
        default: "#ff00ff",
        ...reloadOnChange
    });

    game.settings.register(MODULE_ID, "ElevationColor5", {
        name: "Elevation 5 Color",
        scope: "world",
        config: true,
        type: String,
        default: "#00ffff",
        ...reloadOnChange
    });

    game.settings.register(MODULE_ID, "ElevationColor6", {
        name: "Elevation 6 Color",
        scope: "world",
        config: true,
        type: String,
        default: "#00ff00",
        ...reloadOnChange
    });

    game.settings.register(MODULE_ID, 'ColorTileOpacity', {
        name: "Color Tile Opacity", hint: "choose the opacity of the color overlay when enabled",
        scope: 'world', 
        config: true,
        type: Number, 
        default: 0.3, 
        range: { min: 0, max: 1, step: 0.05 }, 
        ...reloadOnChange
    });


    Hooks.on("renderSettingsConfig", (app, html) => {
          const root = html instanceof HTMLElement ? html : html[0]; // handle either case
        for (const key of ["ElevationColor1", "ElevationColor2", "ElevationColor3", "ElevationColor4", "ElevationColor5", "ElevationColor6"]) {
            const input = root.querySelector(`input[name="${MODULE_ID}.${key}"]`);
            if (input) input.setAttribute("type", "color");
        }
    });

};
