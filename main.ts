function createBall () {
    ball = sprites.create(BALL_IMAGE.clone(), SpriteKind.Enemy)
    ball.vy = randint(-20, 20)
    ball.vx = 60 * (Math.percentChance(50) ? 1 : -1)
}
controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    removeBall(info.player1)
})
controller.up.onEvent(ControllerButtonEvent.Repeated, function () {
    playerOneLastMove = game.runtime()
})
controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    addBall(info.player1)
})
controller.down.onEvent(ControllerButtonEvent.Repeated, function () {
    playerOneLastMove = game.runtime()
})
sprites.onOverlap(SpriteKind.Player, SpriteKind.Enemy, function (sprite, otherSprite) {
    fromCenter = otherSprite.y - sprite.y
    otherSprite.vx = otherSprite.vx * -1.05
    otherSprite.vy += (sprite.vy >> 1) + fromCenter * 3
    otherSprite.startEffect(effects.ashes, 150)
    sprite.startEffect(effects.ashes, 100)
    otherSprite.image.setPixel(randint(1, otherSprite.image.width - 2), randint(1, otherSprite.image.height - 2), sprite.image.getPixel(0, 0))
    pingMessage = !(pingMessage)
    // time out this event so it doesn't retrigger on the same collision
    pause(500)
})
let currTime = 0
let fromCenter = 0
let ball: Sprite = null
let playerOneLastMove = 0
let BALL_IMAGE: Image = null
scene.setBackgroundColor(11)
let pingMessage = false
BALL_IMAGE = img`
    . . . . . . . . . . . . . . . . 
    . . . . . . 4 4 4 4 . . . . . . 
    . . . . 4 4 4 5 5 4 4 4 . . . . 
    . . . 3 3 3 3 4 4 4 4 4 4 . . . 
    . . 4 3 3 3 3 2 2 2 1 1 4 4 . . 
    . . 3 3 3 3 3 2 2 2 1 1 5 4 . . 
    . 4 3 3 3 3 2 2 2 2 2 5 5 4 4 . 
    . 4 3 3 3 2 2 2 4 4 4 4 5 4 4 . 
    . 4 4 3 3 2 2 4 4 4 4 4 4 4 4 . 
    . 4 2 3 3 2 2 4 4 4 4 4 4 4 4 . 
    . . 4 2 3 3 2 4 4 4 4 4 2 4 . . 
    . . 4 2 2 3 2 2 4 4 4 2 4 4 . . 
    . . . 4 2 2 2 2 2 2 2 2 4 . . . 
    . . . . 4 4 2 2 2 2 4 4 . . . . 
    . . . . . . 4 4 4 4 . . . . . . 
    . . . . . . . . . . . . . . . . 
    `
let PADDLE_SPEED = 150
let PADDING_FROM_WALL = 3
// if player doesn't interact for 'TIMEOUT' time, revert to ai
let TIMEOUT = 5000
playerOneLastMove = 0 - TIMEOUT
let playerTwoLastMove = 0 - TIMEOUT
controller.setRepeatDefault(0, 1000);
controller.player2.up.onEvent(ControllerButtonEvent.Repeated, () => playerTwoLastMove = game.runtime());
controller.player2.down.onEvent(ControllerButtonEvent.Repeated, () => playerTwoLastMove = game.runtime());
const playerOne = createPlayer(info.player1);
playerOne.left = PADDING_FROM_WALL
controller.moveSprite(playerOne, 0, PADDLE_SPEED)
const playerTwo = createPlayer(info.player2);
playerTwo.right = screen.width - PADDING_FROM_WALL
controller.player2.moveSprite(playerTwo, 0, PADDLE_SPEED)
createBall()
function createPlayer(player: info.PlayerInfo) {
    const output = sprites.create(image.create(3, 18), SpriteKind.Player);

    output.image.fill(player.bg);
    output.setStayInScreen(true);

    player.setScore(0);
    player.showPlayer = false;

    return output;
}
game.onShade(function () {
    if (pingMessage) {
        screen.printCenter("ping", 5);
    } else {
        screen.printCenter("pong", 5);
    }
})
controller.player2.A.onEvent(ControllerButtonEvent.Pressed, () => addBall(info.player2));
controller.player2.B.onEvent(ControllerButtonEvent.Pressed, () => removeBall(info.player2));
function addBall(player: info.PlayerInfo) {
    player.changeScoreBy(-2);
    createBall();
}
function removeBall(player: info.PlayerInfo) {
    const balls = sprites.allOfKind(SpriteKind.Enemy);
    if (balls.length > 1) {
        Math.pickRandom(balls).destroy();
        player.changeScoreBy(-2);
    }
}
game.onUpdate(function () {
    sprites
        .allOfKind(SpriteKind.Enemy)
        .forEach(b => {
            const scoreRight = b.x < 0;
            const scoreLeft = b.x >= screen.width;

            if (scoreRight) {
                info.player2.changeScoreBy(1)
            } else if (scoreLeft) {
                info.player1.changeScoreBy(1)
            }

            if (b.top < 0) {
                b.vy = Math.abs(b.vy);
            } else if (b.bottom > screen.height) {
                b.vy = -Math.abs(b.vy);
            }

            if (scoreLeft || scoreRight) {
                b.destroy(effects.disintegrate, 500);
                control.runInParallel(function () {
                    pause(250);
                    createBall();
                });
            }
        }
        );
})
game.onUpdate(function () {
    currTime = game.runtime()
    if (playerOneLastMove + TIMEOUT < currTime) {
        trackBall(playerOne);
    }
    if (playerTwoLastMove + TIMEOUT < currTime) {
        trackBall(playerTwo);
    }
    function trackBall(player: Sprite) {
        const next = nextBall(player);
        if (!next)
            return;
        if (ballFacingPlayer(player, next)) {
            // move to where ball is expected to intersect
            intersectBall(player, next);
        } else {
            // relax, ball is going other way
            player.vy = 0;
        }
    }
function nextBall(player: Sprite) {
        return sprites
            .allOfKind(SpriteKind.Enemy)
            .sort((a, b) => {
                const aFacingPlayer = ballFacingPlayer(player, a);
                const bFacingPlayer = ballFacingPlayer(player, b);

                // else prefer ball facing player
                if (aFacingPlayer && !bFacingPlayer) return -1;
                else if (!aFacingPlayer && bFacingPlayer) return 1;

                // else prefer ball that will next reach player
                const aDiff = Math.abs((a.x - player.x) / a.vx);
                const bDiff = Math.abs((b.x - player.x) / b.vx);
                return aDiff - bDiff;
            })[0];
    }
function ballFacingPlayer(player: Sprite, ball: Sprite) {
        return (ball.vx < 0 && player.x < 80) || (ball.vx > 0 && player.x > 80);
    }
function intersectBall(player: Sprite, target: Sprite) {
        const projectedDY = (target.x - player.x) * target.vy / target.vx;
        let intersectionPoint = target.y - projectedDY;

        // quick 'estimation' for vertical bounces
        if (intersectionPoint < 0) {
            intersectionPoint = Math.abs(intersectionPoint % screen.height)
        } else if (intersectionPoint > screen.height) {
            intersectionPoint -= intersectionPoint % screen.height;
        }

        // move toward estimated intersection point if not in range
        if (intersectionPoint > player.y + (player.height >> 2)) {
            player.vy = PADDLE_SPEED;
        } else if (intersectionPoint < player.y - (player.height >> 2)) {
            player.vy = -PADDLE_SPEED;
        } else {
            player.vy = 0;
        }
    }
})
