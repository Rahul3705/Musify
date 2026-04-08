import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';

import { Playlist } from '../../core/models/playlist.model';
import { AuthServiceService } from '../../core/services/auth-service.service';
import { PlaylistServiceService } from '../../core/services/playlist-service.service';
import { MusicPlayerServiceService } from '../../core/services/music-player-service.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
  animations: [
    trigger('expandCollapse', [
      state(
        'expanded',
        style({ height: '*', opacity: 1, overflow: 'visible' })
      ),
      state(
        'collapsed',
        style({ height: '0px', opacity: 0, overflow: 'hidden' })
      ),
      transition(
        'expanded <=> collapsed',
        animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      )
    ])
  ]
})
export class LayoutComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);

  userName = 'User';
  isAdmin = false;
  isUserMenuExpanded = false;

  playlistSearchQuery = '';

  currentPage = 0;
  pageSize = 10;
  hasMorePlaylists = true;
  loadingMorePlaylists = false;

  private _playlists: Playlist[] = [];

  get playlists(): Playlist[] {
    return this._playlists;
  }

  set playlists(value: Playlist[]) {
    this._playlists = Array.isArray(value) ? value : [];
  }

  private playlistObserver?: IntersectionObserver;
  private scrollTriggerEl?: ElementRef;

  @ViewChild('scrollTriggerPlaylists')
  set scrollTriggerPlaylists(el: ElementRef | undefined) {
    this.scrollTriggerEl = el;
    if (el) {
      this.setupPlaylistInfiniteScroll();
    }
  }

  constructor(
    private router: Router,
    private location: Location,
    private authService: AuthServiceService,
    private playlistService: PlaylistServiceService,
    private musicPlayerService: MusicPlayerServiceService
  ) {}

  // ================= INIT =================

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => {
        if (user) {
          this.userName = user.name;
          this.isAdmin = user.role?.toUpperCase() === 'ADMIN';
        }
      });

    this.loadPlaylists();

    this.playlistService.playlistUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadPlaylists());
  }

  ngOnDestroy(): void {
    this.playlistObserver?.disconnect();
  }

  // ================= INFINITE SCROLL =================

  setupPlaylistInfiniteScroll() {
    this.playlistObserver?.disconnect();

    this.playlistObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (
            entry.isIntersecting &&
            this.hasMorePlaylists &&
            !this.loadingMorePlaylists
          ) {
            this.loadMorePlaylists();
          }
        });
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    if (this.scrollTriggerEl) {
      this.playlistObserver.observe(this.scrollTriggerEl.nativeElement);
    }
  }

  // ================= LOAD PLAYLISTS =================

  loadPlaylists() {
    this.currentPage = 0;
    this.hasMorePlaylists = true;
    this.loadingMorePlaylists = true;

    this.playlistService
      .getMyPlaylists(this.currentPage, this.pageSize, this.playlistSearchQuery)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.playlists = response.content;
          this.hasMorePlaylists = !response.last;
          this.loadingMorePlaylists = false;
        },
        error: () => {
          this.playlists = [];
          this.loadingMorePlaylists = false;
        }
      });
  }

  loadMorePlaylists() {
    if (this.loadingMorePlaylists || !this.hasMorePlaylists) return;

    this.loadingMorePlaylists = true;
    this.playlistObserver?.disconnect(); // prevent multi-trigger
    this.currentPage++;

    this.playlistService
      .getMyPlaylists(this.currentPage, this.pageSize, this.playlistSearchQuery)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.playlists = [...this.playlists, ...response.content];
          this.hasMorePlaylists = !response.last;
          this.loadingMorePlaylists = false;
          this.setupPlaylistInfiniteScroll();
        },
        error: () => {
          this.currentPage--;
          this.loadingMorePlaylists = false;
          this.setupPlaylistInfiniteScroll();
        }
      });
  }

  // ================= SEARCH =================

  onSearchPlaylists() {
    this.loadPlaylists();
  }

  clearPlaylistSearch() {
    this.playlistSearchQuery = '';
    this.loadPlaylists();
  }

  // ================= NAVIGATION =================

  goBack() {
    this.location.back();
  }

  goForward() {
    this.location.forward();
  }

  // ================= USER MENU =================

  toggleUserMenu() {
    this.isUserMenuExpanded = !this.isUserMenuExpanded;
  }

  logout() {
    this.musicPlayerService.stop();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}