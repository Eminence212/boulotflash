import {
  clientAvatarUrl,
  googleProfilePhotoUrl,
  isGoogleAvatarUrl,
  isProviderAvatarUrl,
  pickGooglePeoplePhoto,
  readProviderPicture,
} from '../oauth-picture';

describe('readProviderPicture', () => {
  it('lit une URL Google ou GitHub', () => {
    expect(readProviderPicture(' https://lh3.googleusercontent.com/a/x ')).toBe(
      'https://lh3.googleusercontent.com/a/x',
    );
    expect(readProviderPicture('')).toBeNull();
    expect(readProviderPicture(null)).toBeNull();
  });

  it('lit la photo Facebook et ignore la silhouette', () => {
    expect(
      readProviderPicture({
        data: { url: 'https://platform-lookaside.fbsbx.com/p', is_silhouette: false },
      }),
    ).toBe('https://platform-lookaside.fbsbx.com/p');
    expect(
      readProviderPicture({
        data: { url: 'https://example.com/silhouette', is_silhouette: true },
      }),
    ).toBeNull();
  });
});

describe('photo Google', () => {
  it('agrandit la miniature du id_token', () => {
    expect(
      googleProfilePhotoUrl(
        'https://lh3.googleusercontent.com/a/photo=s96-c',
      ),
    ).toBe('https://lh3.googleusercontent.com/a/photo=s256-c');
  });

  it('prend la photo de profil et ignore la lettre par défaut', () => {
    expect(
      pickGooglePeoplePhoto([
        { url: 'https://lh3.googleusercontent.com/a/lettre=s100', default: true },
        {
          url: 'https://lh3.googleusercontent.com/a/vraie=s100',
          default: false,
          metadata: { source: { type: 'PROFILE' } },
        },
      ]),
    ).toBe('https://lh3.googleusercontent.com/a/vraie=s256-c');
  });
});

describe('affichage photo Gmail', () => {
  const userId = '11111111-1111-1111-1111-111111111111';

  it('passe l’image Google par l’API', () => {
    expect(
      clientAvatarUrl(
        userId,
        'https://lh3.googleusercontent.com/a/photo=s256-c',
      ),
    ).toMatch(new RegExp(`^/api/v1/avatars/${userId}\\?v=[a-z0-9]+$`));
  });

  it('laisse GitHub et Facebook tels quels', () => {
    const github = 'https://avatars.githubusercontent.com/u/1?v=4';
    expect(clientAvatarUrl(userId, github)).toBe(github);
    expect(isGoogleAvatarUrl('https://evil.googleusercontent.com.bad/a')).toBe(
      false,
    );
    expect(isGoogleAvatarUrl('http://lh3.googleusercontent.com/a/x')).toBe(
      false,
    );
  });
});

describe('isProviderAvatarUrl', () => {
  it('reconnaît les hôtes des providers', () => {
    expect(
      isProviderAvatarUrl('https://lh3.googleusercontent.com/a/photo'),
    ).toBe(true);
    expect(isProviderAvatarUrl('https://cdn.boulotflash.cd/photo.jpg')).toBe(
      false,
    );
    expect(isProviderAvatarUrl(null)).toBe(false);
  });
});
