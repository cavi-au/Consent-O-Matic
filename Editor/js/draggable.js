/* global cQuery */

class CaviDraggable {
    constructor(html, options) {
        this.html = html;

        let defaultOptions =  {
            activeClass: "droppable-active",
            hoverClass: "droppable-hover",
            cloneClass: null,
            preventDefaultEvents: ["move"],
            cloneParent: cQuery("body"),
            centerClone: true,
            dragMinDistance: 0
        };

        this.options = Object.assign({}, defaultOptions, options);

        new CaviTouch(this.html, {
            dragMinDistance: this.options.dragMinDistance,
            preventDefaultEvents: this.options.preventDefaultEvents,
            eventPrefix: "caviDraggable"
        });

        let self = this;

        this.html.off("caviDraggable.caviDragStart");
        this.html.off("caviDraggable.caviDrag");
        this.html.off("caviDraggable.caviDragStop");
        
        this.html.on("caviDraggable.caviDragStart", (evt)=>{self.dragStart(evt);});
        this.html.on("caviDraggable.caviDrag", (evt)=>{self.drag(evt);});
        this.html.on("caviDraggable.caviDragStop", (evt)=>{self.dragStop(evt);});

        this.clone = null;
        this.droppables = null;
        this.currentDroppable = null;
        this.currentHoverElement = null;
        
        this.lastScrollX = window.scrollX;
        this.lastScrollY = window.scrollY;

        window.addEventListener("scroll", (evt)=>{

            let deltaScrollX = window.scrollX - this.lastScrollX;
            let deltaScrollY = window.scrollY - this.lastScrollY;

            if(self.clone != null) {
                self.updateClonePos(self.lastX+deltaScrollX, self.lastY+deltaScrollY);
            }
            
            this.lastScrollX = window.scrollX;
            this.lastScrollY = window.scrollY;
        });
    }

    dragStart(evt) {
        let self = this;

        function isDescendant(parent, child) {
            var node = child.parentNode;
            while (node != null) {
                if (node == parent) {
                    return true;
                }
                node = node.parentNode;
            }
            return false;
       }

        if(typeof this.options.onStart === "function") {
            this.options.onStart();
        }

        this.html[0].style.pointerEvents = "none";

        this.droppables = cQuery(this.options.dropSelector).filter((droppable)=>{
            if(droppable === self.html[0]) {
                return false;
            }

            if(isDescendant(self.html[0], droppable)) {
                return false;
            }

            return true;
        });

        if(this.options.clone != null) {
            this.clone = this.options.clone;
        } else {
            this.clone = this.html.clone();
        }
        
        if(this.options.cloneClass != null) {
            this.clone.addClass(this.options.cloneClass);
        }

        this.clone[0].style.position = "absolute";
        this.clone[0].style.pointerEvents = "none";
        this.clone[0].style.zIndex = 2000;

        if(this.options.opacity != null) {
            this.clone[0].style.opacity = this.options.opacity;
        }

        this.options.cloneParent.append(this.clone);
        let bounds = this.clone[0].getBoundingClientRect();

        this.offset = {
            x: 0,
            y: 0
        };

        if(this.options.centerClone) {
            this.offset.x -= (-bounds.width/2);
            this.offset.y -= (-bounds.height/2);
        }

        this.droppables.forEach((droppable)=>{
            droppable = cQuery(droppable);
            droppable.addClass(this.options.activeClass);
        });
    }
    updateClonePos(x, y) {
        this.lastX = x;
        this.lastY = y;
        this.clone[0].style.transform = "translate3d("+(x)+"px, "+(y)+"px, 0px)";
    }
    drag(evt) {
        let x = evt.detail.caviEvent.position.x-this.offset.x;
        let y = evt.detail.caviEvent.position.y-this.offset.y;
        
        this.updateClonePos(x, y);
        
        let hoverElm = document.elementFromPoint(evt.detail.caviEvent.positionClient.x, evt.detail.caviEvent.positionClient.y);
        
		this.currentHoverElement = hoverElm;
		
        if(hoverElm != null) {
            let droppable = cQuery(hoverElm);
            
            if(!droppable.is("."+this.options.activeClass)) {
                droppable = droppable.parents("."+this.options.activeClass);
            }

            if(droppable.length > 0) {
                if(this.currentDroppable === null || this.currentDroppable[0] !== droppable[0]) {
                    if(this.currentDroppable !== null) {
                        this.currentDroppable.removeClass(this.options.hoverClass);
                    }
                    droppable.addClass(this.options.hoverClass);
                    this.currentDroppable = droppable;
                }
            } else {
                if(this.currentDroppable !== null) {
                    this.currentDroppable.removeClass(this.options.hoverClass);
                    this.currentDroppable = null;
                }
            }
        }
    }
    dragStop(evt) {
        let dropTarget = this.currentDroppable;

        this.droppables.forEach((droppable)=>{
            droppable = cQuery(droppable);
            droppable.removeClass(this.options.activeClass);
            droppable.removeClass(this.options.hoverClass);
        });

        this.html[0].style.pointerEvents = "";

        if(dropTarget !== null && typeof this.options.onDrop === "function") {
            this.options.onDrop(this.html, dropTarget, this.currentHoverElement);
        }
        
        this.clone.remove();
        this.clone = null;
        this.droppables = null;
        this.currentDroppable = null;
		this.currentHoverElement = null;

        if(typeof this.options.onStop === "function") {
            this.options.onStop();
        }
    }
}
