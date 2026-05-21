import * as THREE from 'three';
import { MatchSnapshot, PlayerSnapshot, Team } from './types.js';

export class RemotePlayers {
  private meshes = new Map<string, THREE.Group>();

  constructor(private scene: THREE.Scene) {}

  update(snapshot: MatchSnapshot, localPlayerId?: string): void {
    const activeIds = new Set(snapshot.players.map(player => player.id));
    for (const [id, mesh] of this.meshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.meshes.delete(id);
      }
    }

    snapshot.players.forEach(player => {
      if (player.id === localPlayerId) return;
      const mesh = this.meshes.get(player.id) ?? this.createPlayerMesh(player);
      if (!this.meshes.has(player.id)) {
        this.meshes.set(player.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(player.position.x, player.position.y - 1.05, player.position.z);
      mesh.rotation.y = player.rotation.y;
      mesh.visible = player.isAlive;
      const healthBar = mesh.getObjectByName('health-fill');
      if (healthBar) {
        healthBar.scale.x = Math.max(0.05, player.health / 100);
      }
    });
  }

  clear(): void {
    this.meshes.forEach(mesh => this.scene.remove(mesh));
    this.meshes.clear();
  }

  private createPlayerMesh(player: PlayerSnapshot): THREE.Group {
    const group = new THREE.Group();
    group.name = `remote-player-${player.id}`;
    const color = this.teamColor(player.team);
    const armor = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.15 });
    const visor = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.15, 6, 12), armor);
    body.position.y = 1.05;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.34, 0.4), armor);
    head.position.y = 1.92;
    head.castShadow = true;
    group.add(head);

    const face = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.035), visor);
    face.position.set(0, 1.94, -0.22);
    group.add(face);

    const weapon = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.75),
      new THREE.MeshStandardMaterial({ color: 0x151719, roughness: 0.45, metalness: 0.7 })
    );
    weapon.position.set(0.38, 1.22, -0.35);
    weapon.rotation.set(0.25, -0.25, 0);
    group.add(weapon);

    const bar = new THREE.Group();
    bar.position.y = 2.45;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.07), new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide }));
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.04), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    fill.name = 'health-fill';
    fill.position.z = 0.002;
    bar.add(bg, fill);
    group.add(bar);

    return group;
  }

  private teamColor(team: Team): number {
    return team === 'attackers' ? 0xd97706 : 0x2563eb;
  }
}
