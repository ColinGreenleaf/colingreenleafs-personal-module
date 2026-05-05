import {selectForAssignment, selectForClearing, clearAllElevations, checkSquareElevation} from "./elevation.mjs";
import {paintDifficultTerrain, eraseDifficultTerrain, clearAllTerrain} from "./terrain.mjs";


export const registerModuleButtons = () => {

    const MODULE_ID = 'colingreenleafs-personal-module';


    //add buttons to the wall controls for selecting squares to assign elevation to, selecting squares to clear elevation from, and clearing all elevation markers from the map
    Hooks.on('getSceneControlButtons', (controls) => {


        controls["elevationControls"] = {
        name: "elevationControls",
        order: Object.keys(controls).length + 1,
        title: "Elevation Controls",
        layer: "elevationControls",
        icon: "fas fa-mountain",
        visible: true,

        tools: {
            'elevation': {
                name: 'elevation',
                title: 'Elevation Builder Tool',
                icon: 'fas fa-arrow-up',
                button: true,
                visible: game.user.isGM,
                onClick: () => {selectForAssignment()}
            },
            'clear-elevation': {
                name: 'clear-elevation',
                title: 'Elevation Eraser Tool',
                icon: 'fas fa-eraser',
                button: true,
                visible: game.user.isGM,
                onClick: () => {selectForClearing()}
            },
            'clear-all-elevation': {
                name: 'clear-all-elevation',
                title: 'Clear Scene Elevation Markers',
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
            'terrain': {
                name: 'terrain',
                title: 'Difficult Terrain Designer',
                icon: 'fas fa-hill-avalanche',
                button: true,
                visible: game.user.isGM,
                onClick: () => {paintDifficultTerrain()}
            },
            'clear-terrain': {
                name: 'clear-terrain',
                title: 'Terrain Eraser Tool',
                icon: 'fas fa-eraser',
                button: true,
                visible: game.user.isGM,
                onClick: () => {eraseDifficultTerrain()}
            },
            'clear-all-terrain': {
                name: 'clear-all-terrain',
                title: 'Clear Scene Terrain Markers',
                icon: 'fas fa-trash-alt',
                button: true,
                visible: game.user.isGM,
                onClick: () => {clearAllTerrain()}
            },
        }
    }

    });

}