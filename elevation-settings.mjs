
export const registerSettings = () => {
  const MODULE_ID = 'colingreenleafs-personal-module';
//   const reloadOnChange = { onChange: () => SettingsConfig.reloadConfirm({ world: true }) };

    game.settings.register(MODULE_ID, "OverlayVisualization", {
        name: `${MODULE_ID}.Settings.OverlayVisualization.Name`,
        hint: `${MODULE_ID}.Settings.OverlayVisualization.Hint`,
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        onChange: {}
    });

    game.settings.register(MODULE_ID, 'OverlayStyle', {
        name: `${MODULE_ID}.Settings.OverlayStyle.Name`,
        hint: `${MODULE_ID}.Settings.OverlayStyle.Hint`,
        scope: "world", config: true, type: String,
        choices: {
        'gradient':          `${MODULE_ID}.Settings.OverlayStyle.Choice.gradient`,
        'color':  `${MODULE_ID}.Settings.OverlayStyle.Choice.color`,
        },
        default: 'gradient',
    });

    game.settings.register(MODULE_ID, "NumberOverlay", {
        name: `${MODULE_ID}.Settings.NumberOverlay.Name`,
        hint: `${MODULE_ID}.Settings.NumberOverlay.Hint`,
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: {}
    });
    game.settings.register(MODULE_ID, "NumberOverlayColor", {
        name: `${MODULE_ID}.Settings.NumberOverlayColor.Name`,
        hint: `${MODULE_ID}.Settings.NumberOverlayColor.Hint`,
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: {}
    });
};
