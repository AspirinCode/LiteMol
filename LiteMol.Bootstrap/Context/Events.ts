/*
 * Copyright (c) 2016 David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */


namespace LiteMol.Bootstrap {
    "use strict";
    
    function createMoleculeModelSelectInteraction(context: Context, what: { visual: Bootstrap.Entity.Molecule.Visual, query: Core.Structure.Query.Source }) {
        if (!Entity.isVisual(what.visual)) {
            console.warn('Select: Trying to create a selection event on a non-molecule model visual entity, ignoring...');
            return;
        }        
        let q = Utils.Molecule.getModelAndIndicesFromQuery(what.visual, what.query);
        if (!q || !q.indices.length) return;
        
        let entity = Tree.Node.findClosestNodeOfType(what.visual, [Entity.Molecule.Model, Entity.Molecule.Selection]);
        Event.Visual.VisualSelectElement.dispatch(context, { entity, visual: what.visual, elements: q.indices });
    }
 
    export function initEventsAndCommands(context: Context) {
        
        Command.Entity.SetCurrent.getStream(context).subscribe(e => Entity.setCurrent(e.data as Entity.Any));
        Command.Entity.SetVisibility.getStream(context).subscribe(e => Entity.setVisibility(e.data.entity, e.data.visible));
        Command.Entity.ToggleExpanded.getStream(context).subscribe(e => Entity.toggleExpanded(e.data));
        Command.Tree.RemoveNode.getStream(context).subscribe(e => context.select(e.data).forEach(n => Tree.remove(n)));
        Command.Tree.ApplyTransform.getStream(context).subscribe(e => { (e.data.isUpdate ? e.data.transform.update(context, e.data.node) : e.data.transform.apply(context, e.data.node)).run(context) });
                
        Event.Tree.NodeAdded.getStream(context).subscribe(e => {
            let vis = (e.data.parent as Entity.Any).state.visibility;
            let visible = vis !== Entity.Visibility.None;
            Entity.setVisibility(e.data, visible);
            
            if (Entity.isClass(e.data, Entity.BehaviourClass)) {
                let b = e.data as Entity.Behaviour.Any;
                b.props.behaviour.register(b);
            }
        });
        Event.Tree.NodeRemoved.getStream(context).subscribe(e => {
            Entity.updateVisibilityState(e.data.parent);
            
            if (Entity.isClass(e.data, Entity.BehaviourClass)) {
                let b = e.data as Entity.Behaviour.Any;
                b.props.behaviour.dispose();
            }
        });
                
        Event.Visual.VisualHoverElement.getStream(context)        
            .distinctUntilChanged(e => e.data, Interactivity.interactivityInfoEqual)
            .map(e => Interactivity.Molecule.transformInteraction(e.data))
            .distinctUntilChanged(e => e, (x, y) => x === y)
            .subscribe(info => Event.Molecule.ModelHighlight.dispatch(context, info));
            
        Event.Visual.VisualSelectElement.getStream(context)
            .distinctUntilChanged(e => e.data, Interactivity.interactivityInfoEqual)
            .map(e => Interactivity.Molecule.transformInteraction(e.data))            
            .distinctUntilChanged(e => e, (x, y) => x === y)
            .subscribe(info => Event.Molecule.ModelSelect.dispatch(context, info));           
        
        Command.Molecule.CreateSelectInteraction.getStream(context).subscribe(e => createMoleculeModelSelectInteraction(context, e.data));
        
    }
    
}