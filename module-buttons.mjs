import {selectForAssignment, selectForClearing, renderElevationOverlay, clearAllElevations, getSquareElevation, checkSquareElevation} from "./elevation.mjs";


export const registerModuleButtons = () => {

    const MODULE_ID = 'colingreenleafs-personal-module';

    const addTools = (control, tools) => {
        if (!control) return;
        if (Array.isArray(control.tools)) {
            control.tools.push(...Object.values(tools));
        } else {
            let orderIndex = Object.keys(control.tools).length;
            for (const [key, tool] of Object.entries(tools)) {
            tool.order = orderIndex++;
            control.tools[key] = tool;
            }
        }
    };

    //add buttons to the wall controls for selecting squares to assign elevation to, selecting squares to clear elevation from, and clearing all elevation markers from the map
    Hooks.on('getSceneControlButtons', (controls) => {
    const wallControl  = controls.walls  || controls.wall;
    addTools(wallControl, {
        'elevation': {
        name: 'elevation',
        title: 'Elevation Designer',
        icon: 'fas fa-arrow-up',
        button: true,
        visible: game.user.isGM,
        onClick: () => {selectForAssignment()}
        },
        'clear-elevation': {
        name: 'clear-elevation',
        title: 'Elevation Remover',
        icon: 'fas fa-arrow-down',
        button: true,
        visible: game.user.isGM,
        onClick: () => {selectForClearing()}
        },
        'clear-all-elevation': {
        name: 'clear-all-elevation',
        title: 'Clear All Elevation Markers',
        icon: 'fas fa-trash-alt',
        button: true,
        visible: game.user.isGM,
        onClick: () => {clearAllElevations()}
        },
        'check-elevation': {
        name: 'check-elevation',
        title: 'Check Elevation',
        icon: 'fas fa-search',
        button: true,
        visible: game.user.isGM,
        onClick: () => {checkSquareElevation()}
        },
    });
    });

}